from fastapi import FastAPI
from .control import router as control_router, BOT_PROC

app = FastAPI(title="FoulPlay Backend")
app.include_router(control_router)

@app.get("/status")
def status():
    running = BOT_PROC is not None and BOT_PROC.poll() is None
    return {"ok": True, "bot_running": running}
