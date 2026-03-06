from __future__ import annotations

import json
import random
import re
import string
import uuid
from datetime import datetime, timezone

from api.config import settings
from api.monetization_models import PromoClaimRecord, PromoCodeRecord, ReferralEventRecord
from api.services.async_runner import run_async
from api.services.backboard_service import get_client
from api.services.balance_service import award_token_credits, token_credits_to_usd, usd_to_token_credits
from api.services.user_service import find_user_by_id, get_all_users, update_user_field

PROMO_CODE_META_TYPE = "nash_promo_code"
PROMO_CLAIM_META_TYPE = "nash_promo_claim"
REFERRAL_EVENT_META_TYPE = "nash_referral_event"


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _list_auth_records(memory_type: str) -> list[tuple[dict, str]]:
    client = get_client()
    response = await client.get_memories(settings.backboard_auth_assistant_id)
    records: list[tuple[dict, str]] = []
    for memory in response.memories:
        meta = memory.metadata or {}
        if meta.get("type") != memory_type:
            continue
        try:
            records.append((json.loads(memory.content), memory.id))
        except (TypeError, json.JSONDecodeError):
            continue
    return records


def _sanitize_code(seed: str) -> str:
    cleaned = re.sub(r"[^A-Z0-9]", "", seed.upper())
    return cleaned[:8] or "NASH"


def _random_suffix(length: int = 4) -> str:
    return "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(length))


def _find_user_by_referral_code(code: str) -> dict | None:
    normalized = code.strip().upper()
    for user in get_all_users():
        if (user.get("referralCode") or "").upper() == normalized:
            return user
    return None


def referral_code_exists(code: str) -> bool:
    return _find_user_by_referral_code(code) is not None


def get_or_create_referral_code(user: dict) -> str:
    existing = (user.get("referralCode") or "").strip().upper()
    if existing:
        return existing

    base = _sanitize_code(user.get("username") or user.get("name") or user.get("email") or "NASH")
    for _ in range(10):
        candidate = f"{base}{_random_suffix()}"
        if _find_user_by_referral_code(candidate) is None:
            update_user_field(user, "referralCode", candidate)
            return candidate
    candidate = f"NASH{_random_suffix(6)}"
    update_user_field(user, "referralCode", candidate)
    return candidate


def _create_referral_event(
    *,
    referrer_user_id: str,
    referred_user_id: str,
    referral_code: str,
    event_type: str,
    metadata: dict[str, str | int | float | bool | None] | None = None,
) -> None:
    event = ReferralEventRecord(
        id=str(uuid.uuid4()),
        referrerUserId=referrer_user_id,
        referredUserId=referred_user_id,
        referralCode=referral_code,
        eventType=event_type,
        metadata=metadata or {},
        createdAt=_now(),
    )

    async def _save() -> None:
        client = get_client()
        await client.add_memory(
            assistant_id=settings.backboard_auth_assistant_id,
            content=json.dumps(event.model_dump(mode="json")),
            metadata={
                "type": REFERRAL_EVENT_META_TYPE,
                "eventId": event.id,
                "eventType": event.eventType,
                "referrerUserId": referrer_user_id,
                "referredUserId": referred_user_id,
            },
        )

    run_async(_save())


def apply_referral_code_to_user(user: dict, code: str) -> dict:
    normalized = code.strip().upper()
    if not normalized:
        raise ValueError("Referral code is required")
    if user.get("referredByUserId"):
        raise ValueError("Referral code already applied")

    referrer = _find_user_by_referral_code(normalized)
    if referrer is None:
        raise ValueError("Referral code not found")
    if referrer.get("id") == user.get("id"):
        raise ValueError("You cannot use your own referral code")

    update_user_field(user, "referredByCode", normalized)
    update_user_field(user, "referredByUserId", referrer["id"])
    update_user_field(user, "referredAt", _now().isoformat())
    _create_referral_event(
        referrer_user_id=referrer["id"],
        referred_user_id=user["id"],
        referral_code=normalized,
        event_type="signup_attributed",
    )
    return {
        "referrerUserId": referrer["id"],
        "referralCode": normalized,
    }


def list_promo_codes() -> list[dict]:
    records = run_async(_list_auth_records(PROMO_CODE_META_TYPE))
    promos: list[PromoCodeRecord] = []
    for payload, _memory_id in records:
        try:
            promos.append(PromoCodeRecord.model_validate(payload))
        except Exception:
            continue
    promos.sort(key=lambda promo: promo.createdAt, reverse=True)
    return [promo.model_dump(mode="json") for promo in promos]


def get_promo_code(code: str) -> dict | None:
    normalized = code.strip().upper()
    records = run_async(_list_auth_records(PROMO_CODE_META_TYPE))
    for payload, _memory_id in records:
        try:
            promo = PromoCodeRecord.model_validate(payload)
        except Exception:
            continue
        if promo.code.upper() == normalized:
            return promo.model_dump(mode="json")
    return None


def create_promo_code(
    *,
    code: str,
    created_by: str,
    usd_value: float | None = None,
    token_credits_awarded: int | None = None,
    max_uses: int | None = None,
    active: bool = True,
) -> dict:
    normalized = code.strip().upper()
    if not normalized:
        raise ValueError("Promo code is required")
    if token_credits_awarded is None:
        token_credits_awarded = usd_to_token_credits(usd_value or 0.0)
    if token_credits_awarded <= 0:
        raise ValueError("Promo code must award credits")

    existing_promos = run_async(_list_auth_records(PROMO_CODE_META_TYPE))
    for payload, memory_id in existing_promos:
        try:
            existing = PromoCodeRecord.model_validate(payload)
        except Exception:
            continue
        if existing.code.upper() != normalized:
            continue
        updated = existing.model_copy(
            update={
                "tokenCreditsAwarded": token_credits_awarded,
                "usdValue": token_credits_to_usd(token_credits_awarded),
                "maxUses": max_uses,
                "active": active,
                "updatedAt": _now(),
            }
        )

        async def _update() -> None:
            client = get_client()
            await client.update_memory(
                assistant_id=settings.backboard_auth_assistant_id,
                memory_id=memory_id,
                content=json.dumps(updated.model_dump(mode="json")),
                metadata={"type": PROMO_CODE_META_TYPE, "code": normalized},
            )

        run_async(_update())
        return updated.model_dump(mode="json")

    promo = PromoCodeRecord(
        code=normalized,
        tokenCreditsAwarded=token_credits_awarded,
        usdValue=token_credits_to_usd(token_credits_awarded),
        maxUses=max_uses,
        active=active,
        createdBy=created_by,
        createdAt=_now(),
        updatedAt=_now(),
    )

    async def _save() -> None:
        client = get_client()
        await client.add_memory(
            assistant_id=settings.backboard_auth_assistant_id,
            content=json.dumps(promo.model_dump(mode="json")),
            metadata={"type": PROMO_CODE_META_TYPE, "code": normalized},
        )

    run_async(_save())
    return promo.model_dump(mode="json")


def redeem_promo_code(user_id: str, code: str) -> dict:
    normalized = code.strip().upper()
    promo_records = run_async(_list_auth_records(PROMO_CODE_META_TYPE))
    claim_records = run_async(_list_auth_records(PROMO_CLAIM_META_TYPE))

    promo: PromoCodeRecord | None = None
    for payload, _memory_id in promo_records:
        try:
            parsed = PromoCodeRecord.model_validate(payload)
        except Exception:
            continue
        if parsed.code.upper() == normalized:
            promo = parsed
            break

    if promo is None or not promo.active:
        raise ValueError("Promo code not found")

    matching_claims: list[PromoClaimRecord] = []
    for payload, _memory_id in claim_records:
        try:
            claim = PromoClaimRecord.model_validate(payload)
        except Exception:
            continue
        if claim.code.upper() == normalized:
            matching_claims.append(claim)
        if claim.code.upper() == normalized and claim.userId == user_id:
            raise ValueError("Promo code already redeemed")

    if promo.maxUses is not None and len(matching_claims) >= promo.maxUses:
        raise ValueError("Promo code has reached its maximum uses")

    claim = PromoClaimRecord(
        code=normalized,
        userId=user_id,
        tokenCreditsAwarded=promo.tokenCreditsAwarded,
        createdAt=_now(),
    )

    async def _save_claim() -> None:
        client = get_client()
        await client.add_memory(
            assistant_id=settings.backboard_auth_assistant_id,
            content=json.dumps(claim.model_dump(mode="json")),
            metadata={"type": PROMO_CLAIM_META_TYPE, "code": normalized, "userId": user_id},
        )

    run_async(_save_claim())
    balance = award_token_credits(
        user_id,
        token_credits=promo.tokenCreditsAwarded,
        entry_type="promo_redemption",
        description=f"Promo code {normalized}",
        metadata={"code": normalized},
    )
    return {
        "code": normalized,
        "tokenCreditsAwarded": promo.tokenCreditsAwarded,
        "usdValue": token_credits_to_usd(promo.tokenCreditsAwarded),
        "balance": balance,
    }


def grant_referral_reward_if_eligible(referred_user_id: str, *, source: str) -> dict | None:
    referred_user = find_user_by_id(referred_user_id)
    if referred_user is None:
        return None
    if referred_user.get("referralRewardGrantedAt"):
        return None

    referrer_user_id = referred_user.get("referredByUserId") or ""
    referral_code = referred_user.get("referredByCode") or ""
    if not referrer_user_id or not referral_code:
        return None

    referrer_user = find_user_by_id(referrer_user_id)
    if referrer_user is None:
        return None

    bonus_credits = usd_to_token_credits(settings.referral_bonus_usd)
    balance = award_token_credits(
        referrer_user_id,
        token_credits=bonus_credits,
        entry_type="referral_reward",
        description=f"Referral reward for {referred_user.get('email', referred_user_id)}",
        metadata={"referredUserId": referred_user_id, "source": source},
    )
    update_user_field(referred_user, "referralRewardGrantedAt", _now().isoformat())
    _create_referral_event(
        referrer_user_id=referrer_user_id,
        referred_user_id=referred_user_id,
        referral_code=referral_code,
        event_type="reward_granted",
        metadata={"source": source, "bonusCredits": bonus_credits},
    )
    return {
        "referrerUserId": referrer_user_id,
        "bonusCredits": bonus_credits,
        "bonusUsd": token_credits_to_usd(bonus_credits),
        "balance": balance,
    }


def get_referral_summary(user_id: str) -> dict:
    user = find_user_by_id(user_id)
    if user is None:
        raise ValueError("User not found")

    referral_code = get_or_create_referral_code(user)
    referred_users = [u for u in get_all_users() if u.get("referredByUserId") == user_id]
    recent_referrals = []
    for referred_user in sorted(referred_users, key=lambda item: item.get("referredAt", ""), reverse=True)[:5]:
        recent_referrals.append({
            "userId": referred_user.get("id", ""),
            "name": referred_user.get("name") or referred_user.get("email", ""),
            "referredAt": referred_user.get("referredAt"),
            "rewardGrantedAt": referred_user.get("referralRewardGrantedAt"),
        })

    reward_credits = usd_to_token_credits(settings.referral_bonus_usd)
    return {
        "referralCode": referral_code,
        "referralLink": f"{settings.domain_client}/register?ref={referral_code}",
        "rewardTokenCredits": reward_credits,
        "rewardUsd": token_credits_to_usd(reward_credits),
        "stats": {
            "signups": len(referred_users),
            "paidConversions": len([u for u in referred_users if u.get("referralRewardGrantedAt")]),
        },
        "referredByCode": user.get("referredByCode") or None,
        "recentReferrals": recent_referrals,
    }
