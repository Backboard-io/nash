from flask import Blueprint, jsonify, request, g

from api.middleware.jwt_auth import require_jwt
from api.services.user_service import find_user_by_id, update_user_field, get_user_assistant_id
from api.services.backboard_service import get_client
from api.services.async_runner import run_async
from api.services import conversation_service
from api.services.balance_service import get_balance_response

user_bp = Blueprint("user", __name__)

CHAT_DATA_TYPES = {"thread_mapping", "conversation_meta"}
USER_MEMORY_INTERNAL_TYPES = {
    "prompt", "prompt_group", "user_favorites",
    "file_meta", "agent", "shared_link",
    "tag", "folder", "preset",
    "user", "librechat_user", "user_memory",
}


@user_bp.route("/api/user", methods=["GET"])
@require_jwt
def get_user():
    user = find_user_by_id(g.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "id": user["id"],
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "username": user.get("username", ""),
        "nickname": user.get("nickname", ""),
        "avatar": user.get("avatar", ""),
        "provider": user.get("provider", ""),
        "role": user.get("role", "USER"),
        "createdAt": user.get("createdAt", ""),
        "updatedAt": user.get("updatedAt", ""),
    })


@user_bp.route("/api/user/profile", methods=["PATCH"])
@require_jwt
def update_profile():
    data = request.get_json() or {}
    user = find_user_by_id(g.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if "nickname" in data:
        nickname = str(data["nickname"]).strip()[:64]
        update_user_field(user, "nickname", nickname)
    return jsonify({
        "id": user["id"],
        "nickname": user.get("nickname", ""),
    })


@user_bp.route("/api/user/chat-data", methods=["DELETE"])
@require_jwt
def delete_chat_data():
    assistant_id = get_user_assistant_id(g.user_id)

    async def _delete_all():
        client = get_client()
        response = await client.get_memories(assistant_id)
        deleted = 0
        for m in response.memories:
            meta = m.metadata or {}
            mem_type = meta.get("type", "")
            if mem_type in CHAT_DATA_TYPES or mem_type not in USER_MEMORY_INTERNAL_TYPES:
                try:
                    await client.delete_memory(assistant_id=assistant_id, memory_id=m.id)
                    deleted += 1
                except Exception:
                    pass
        return deleted

    deleted = run_async(_delete_all())
    # Clear in-memory thread cache for this assistant
    conversation_service._thread_map.clear()
    conversation_service._loaded_assistants.discard(assistant_id)
    return jsonify({"message": f"Cleared {deleted} records"})


@user_bp.route("/api/user/terms", methods=["GET"])
@require_jwt
def get_terms():
    return jsonify({"termsOfService": None, "privacyPolicy": None})


@user_bp.route("/api/user/terms/accept", methods=["POST"])
@require_jwt
def accept_terms():
    return jsonify({"message": "ok"})


@user_bp.route("/api/balance", methods=["GET"])
@require_jwt
def get_balance():
    return jsonify(get_balance_response(g.user_id))
