import asyncio

from fastapi import WebSocket, WebSocketDisconnect


async def proxy_websocket(websocket: WebSocket, vnc_host: str, vnc_port: int) -> None:
    """
    Proxy a WebSocket connection to a raw TCP VNC server.

    Opens the WebSocket, connects to the VNC server over TCP, then
    runs two concurrent relay tasks (ws->tcp and tcp->ws) until either
    side disconnects.
    """
    await websocket.accept()

    try:
        reader, writer = await asyncio.open_connection(vnc_host, vnc_port)
    except Exception as exc:
        await websocket.close(code=1011, reason=f"Could not connect to VNC: {exc}")
        return

    stop = asyncio.Event()

    async def ws_to_tcp():
        try:
            while not stop.is_set():
                message = await websocket.receive()
                if message["type"] == "websocket.disconnect":
                    break
                data = message.get("bytes")
                if data is None:
                    text = message.get("text")
                    data = text.encode() if text is not None else None
                if data:
                    writer.write(data)
                    await writer.drain()
        except (WebSocketDisconnect, RuntimeError, Exception):
            pass
        finally:
            stop.set()

    async def tcp_to_ws():
        try:
            while not stop.is_set():
                try:
                    data = await asyncio.wait_for(reader.read(65536), timeout=30.0)
                except asyncio.TimeoutError:
                    # An idle VNC console is normal (no screen updates). Keep the
                    # bridge open instead of tearing down a healthy session.
                    continue
                if not data:
                    break
                await websocket.send_bytes(data)
        except (WebSocketDisconnect, RuntimeError, Exception):
            pass
        finally:
            stop.set()

    tasks = [
        asyncio.create_task(ws_to_tcp()),
        asyncio.create_task(tcp_to_ws()),
    ]

    # Wait until either relay task finishes
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

    # Cancel the remaining task
    for task in pending:
        task.cancel()
        try:
            await task
        except BaseException:
            pass

    # Close the TCP connection
    try:
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
    except Exception:
        pass

    # Close the WebSocket if still open
    try:
        await websocket.close()
    except Exception:
        pass
