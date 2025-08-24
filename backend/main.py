from fastapi import FastAPI
from chatbot_router import router as chatbot_router

app = FastAPI()

app.include_router(chatbot_router, prefix="/api")