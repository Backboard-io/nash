from flask import Blueprint, jsonify, request, g

from api.middleware.jwt_auth import require_jwt
from api.services.balance_service import get_balance_response
from api.services.referral_service import (
    apply_referral_code_to_user,
    create_promo_code,
    get_promo_code,
    get_referral_summary,
    list_promo_codes,
    redeem_promo_code,
)
from api.services.user_service import find_user_by_id

referrals_bp = Blueprint("referrals", __name__)


def _require_admin() -> dict | None:
    caller = find_user_by_id(g.user_id)
    if not caller or caller.get("role", "").upper() != "ADMIN":
        return None
    return caller


@referrals_bp.route("/api/referrals/me", methods=["GET"])
@require_jwt
def get_my_referral_summary():
    try:
        return jsonify(get_referral_summary(g.user_id))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404


@referrals_bp.route("/api/referrals/redeem", methods=["POST"])
@require_jwt
def redeem_code():
    user = find_user_by_id(g.user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    code = str(data.get("code") or "").strip().upper()
    if not code:
        return jsonify({"error": "Code is required"}), 400

    promo = get_promo_code(code)
    try:
        if promo is not None:
            result = redeem_promo_code(g.user_id, code)
            return jsonify({"kind": "promo", **result})

        referral_result = apply_referral_code_to_user(user, code)
        return jsonify({
            "kind": "referral",
            **referral_result,
            "balance": get_balance_response(g.user_id),
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@referrals_bp.route("/api/admin/promo-codes", methods=["GET"])
@require_jwt
def admin_list_promo_codes():
    if _require_admin() is None:
        return jsonify({"error": "Forbidden"}), 403
    return jsonify({"promoCodes": list_promo_codes()})


@referrals_bp.route("/api/admin/promo-codes", methods=["POST"])
@require_jwt
def admin_create_promo_code():
    caller = _require_admin()
    if caller is None:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json() or {}
    try:
        promo = create_promo_code(
            code=str(data.get("code") or ""),
            created_by=caller["id"],
            usd_value=float(data["usdValue"]) if data.get("usdValue") is not None else None,
            token_credits_awarded=int(data["tokenCreditsAwarded"])
            if data.get("tokenCreditsAwarded") is not None
            else None,
            max_uses=int(data["maxUses"]) if data.get("maxUses") is not None else None,
            active=bool(data.get("active", True)),
        )
        return jsonify(promo), 201
    except (TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400
