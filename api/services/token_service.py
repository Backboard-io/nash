"""Token usage tracking and enforcement."""
import time
from datetime import datetime, timezone

import stripe

from api.config import settings
from api.services.user_service import find_user_by_id, update_user_field
from api.routes.billing import get_user_plan, PLAN_TOKENS

stripe.api_key = settings.stripe_secret_key


def _current_period_start() -> str:
    """Return the first day of the current month in UTC ISO format."""
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()


def _ensure_period(user: dict) -> None:
    """Reset token usage if we've entered a new billing period."""
    period_start = _current_period_start()
    stored_reset = user.get("tokenUsageResetAt", "")
    if stored_reset != period_start:
        user["tokenUsage"] = 0
        user["tokenUsageResetAt"] = period_start
        user["meteredOverageReportedUnits"] = 0
        update_user_field(user, "tokenUsage", 0)
        update_user_field(user, "tokenUsageResetAt", period_start)
        update_user_field(user, "meteredOverageReportedUnits", 0)


def get_token_usage(user_id: str) -> dict:
    """Return current usage, limit, and remaining tokens for a user."""
    user = find_user_by_id(user_id)
    if not user:
        return {"usageTokens": 0, "includedTokens": 0, "tokensRemaining": 0}

    _ensure_period(user)
    plan = get_user_plan(user)
    limit = PLAN_TOKENS.get(plan, PLAN_TOKENS["free"])
    usage = int(user.get("tokenUsage", 0) or 0)
    remaining = max(0, limit - usage)
    overage_tokens = max(0, usage - limit)

    return {
        "usageTokens": usage,
        "includedTokens": limit,
        "tokensRemaining": remaining,
        "overageTokens": overage_tokens,
        "overageEnabled": plan != "free",
    }


def check_token_limit(user_id: str) -> str | None:
    """Return an error message if the user has exceeded their token limit, else None."""
    info = get_token_usage(user_id)
    if info["tokensRemaining"] <= 0 and not info["overageEnabled"]:
        return (
            f"You've used all {info['includedTokens']:,} tokens in your plan this month. "
            f"Upgrade your plan or wait until next month."
        )
    return None


def _report_metered_overage_units(user: dict, plan: str, usage_total: int) -> None:
    included_tokens = PLAN_TOKENS.get(plan, PLAN_TOKENS["free"])
    overage_tokens = max(0, usage_total - included_tokens)
    chunk_size = max(1, settings.stripe_overage_tokens_per_unit)
    reportable_units = overage_tokens // chunk_size
    already_reported_units = int(user.get("meteredOverageReportedUnits", 0) or 0)
    delta_units = reportable_units - already_reported_units
    if delta_units <= 0:
        return

    subscription_item_id = user.get("stripeMeteredItemId", "")
    if not subscription_item_id:
        print(
            f"[token] WARN: user {user.get('email')} exceeded included usage but has no stripeMeteredItemId"
        )
        return

    try:
        stripe.SubscriptionItem.create_usage_record(
            subscription_item_id,
            quantity=delta_units,
            timestamp=int(time.time()),
            action="increment",
        )
        update_user_field(user, "meteredOverageReportedUnits", reportable_units)
        print(
            f"[token] reported {delta_units} metered overage units for {user.get('email')} "
            f"({overage_tokens} tokens over included usage)"
        )
    except Exception as exc:
        print(f"[token] WARN: failed to report metered overage for {user.get('email')}: {exc}")


def record_token_usage(user_id: str, tokens: int) -> None:
    """Add tokens to the user's monthly usage counter."""
    if tokens <= 0:
        return
    user = find_user_by_id(user_id)
    if not user:
        print(f"[token] WARN: user {user_id} not found, cannot record {tokens} tokens")
        return
    _ensure_period(user)
    plan = get_user_plan(user)
    prev = int(user.get("tokenUsage", 0) or 0)
    new_total = prev + tokens
    update_user_field(user, "tokenUsage", new_total)
    if plan != "free":
        _report_metered_overage_units(user, plan, new_total)
    print(f"[token] recorded {tokens} tokens for {user.get('email')}: {prev} -> {new_total}")


def reset_token_usage(user_id: str) -> None:
    """Admin: reset a user's token usage to zero."""
    user = find_user_by_id(user_id)
    if not user:
        return
    update_user_field(user, "tokenUsage", 0)
    update_user_field(user, "tokenUsageResetAt", _current_period_start())
    update_user_field(user, "meteredOverageReportedUnits", 0)
