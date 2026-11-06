from fastapi import APIRouter

from services import qemu_service as qemu

router = APIRouter()


@router.get("/host/capabilities")
async def capabilities():
    """Describe the types of virtualization and guest architectures this host supports."""
    return qemu.capabilities()
