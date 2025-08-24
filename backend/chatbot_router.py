from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
import httpx
from datetime import datetime
from typing import Dict
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

router = APIRouter()

# Load environment variables from .env file
load_dotenv()
# Use SUPABASE_DB_URL for Neon connection
NEON_DB_URL = os.getenv("SUPABASE_DB_URL_ASYNC")

# Create async SQLAlchemy engine
engine = create_async_engine(NEON_DB_URL, echo=False, future=True)

# Example: Dependency to get user_id from JWT (adjust as per your auth)
def get_user_id(request: Request):
    # Example: parse JWT from Authorization header
    token = request.headers.get('authorization', '').replace('Bearer ', '')
    # ...decode token and extract user_id...
    return 1  # Replace with real user_id extraction

# Async function to get total spending from the database
async def get_total_spending(period: str = "this_month"):
    async with engine.connect() as conn:
        if period == "last_month":
            query = text("""
                SELECT COALESCE(SUM(amount),0) as total FROM payments
                WHERE payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                  AND payment_date < date_trunc('month', CURRENT_DATE)
            """)
        elif period == "last_week":
            query = text("""
                SELECT COALESCE(SUM(amount),0) as total FROM payments
                WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'
            """)
        else:  # this_month
            query = text("""
                SELECT COALESCE(SUM(amount),0) as total FROM expenses
                WHERE date >= date_trunc('month', CURRENT_DATE)
            """)
        result = await conn.execute(query)
        row = result.fetchone()
        return row[0] if row else 0

@router.post('/chatbot')
async def chatbot_endpoint(payload: Dict, request: Request, user_id: int = Depends(get_user_id)):
    # Savings intent
    if 'savings' in question:
        # Example: Assume a fixed budget or fetch from DB/user profile if available
        budget = 10000  # You can replace this with a dynamic value
        # Get total expenses this month
        async with engine.connect() as conn:
            query = text("""
                SELECT COALESCE(SUM(amount),0) as total FROM expenses
                WHERE date >= date_trunc('month', CURRENT_DATE)
            """)
            result = await conn.execute(query)
            row = result.fetchone()
            expenses = row[0] if row else 0
        savings = budget - expenses
        return {"answer": f"Your estimated savings this month are ₹{savings}. (Budget: ₹{budget}, Expenses: ₹{expenses})"}

    # Trends intent
    if 'trend' in question:
        async with engine.connect() as conn:
            # This month
            query1 = text("""
                SELECT COALESCE(SUM(amount),0) as total FROM expenses
                WHERE date >= date_trunc('month', CURRENT_DATE)
            """)
            result1 = await conn.execute(query1)
            row1 = result1.fetchone()
            this_month = row1[0] if row1 else 0
            # Last month
            query2 = text("""
                SELECT COALESCE(SUM(amount),0) as total FROM expenses
                WHERE date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                  AND date < date_trunc('month', CURRENT_DATE)
            """)
            result2 = await conn.execute(query2)
            row2 = result2.fetchone()
            last_month = row2[0] if row2 else 0
        diff = this_month - last_month
        trend = "increased" if diff > 0 else ("decreased" if diff < 0 else "remained the same")
        return {"answer": f"Your spending has {trend} by ₹{abs(diff)} compared to last month. (This month: ₹{this_month}, Last month: ₹{last_month})"}

    # Financial health tips intent
    if 'tip' in question or 'advice' in question or 'health' in question:
        # Simple static or dynamic tips
        tips = [
            "Track your expenses regularly to avoid overspending.",
            "Set a monthly budget and try to save at least 20% of your income.",
            "Review your subscriptions and cancel those you don't use.",
            "Plan for emergencies by building an emergency fund.",
            "Use digital tools to automate bill payments and savings."
        ]
        import random
        tip = random.choice(tips)
        return {"answer": f"Financial Health Tip: {tip}"}
    print("[DEBUG] /chatbot endpoint called with payload:", payload)
    question = payload.get('message', '').lower()
    # Enhanced intent detection
    if any(word in question for word in ['last week', 'past week', 'previous week']):
        print("[DEBUG] Detected 'last week' intent. About to call get_total_spending('last_week')")
        total = await get_total_spending("last_week")
        print("[DEBUG] DB call returned:", total)
        return {"answer": f"You have spent ₹{total} in the last week."}
    elif any(word in question for word in ['last month', 'past month', 'previous month']):
        print("[DEBUG] Detected 'last month' intent. About to call get_total_spending('last_month')")
        total = await get_total_spending("last_month")
        print("[DEBUG] DB call returned:", total)
        return {"answer": f"You have spent ₹{total} last month."}
    elif 'expenses' in question and 'this month' in question:
        print("[DEBUG] Detected 'expenses this month' intent. Querying expenses table.")
        async with engine.connect() as conn:
            query = text("""
                SELECT COALESCE(SUM(amount),0) as total FROM expenses
                WHERE date >= date_trunc('month', CURRENT_DATE)
            """)
            result = await conn.execute(query)
            row = result.fetchone()
            total = row[0] if row else 0
        print("[DEBUG] Expenses DB call returned:", total)
        return {"answer": f"Your total expenses this month are ₹{total}."}
    elif (('payment' in question or 'payments' in question) and 'this month' in question) or (('spending' in question or 'spent' in question) and 'this month' in question):
        print("[DEBUG] Detected 'payments/spending this month' intent. Querying payments table.")
        total = await get_total_spending("this_month")
        print("[DEBUG] Payments DB call returned:", total)
        return {"answer": f"You have spent ₹{total} this month."}
    print("[DEBUG] No finance intent detected, falling back to public AI.")
    # Fallback to public AI (HuggingFace, upgraded model) with logging and robust error handling
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                'https://api-inference.huggingface.co/models/google/flan-t5-large',
                json={"inputs": question},
                timeout=60
            )
            data = resp.json()
            print("[HuggingFace API response]", data)  # Log the raw response
            if isinstance(data, list) and data and 'generated_text' in data[0]:
                reply = data[0]['generated_text']
            elif isinstance(data, dict) and 'error' in data:
                reply = f"AI error: {data['error']}"
            else:
                reply = 'Sorry, I could not understand.'
            return {"answer": reply}
    except Exception as e:
        print("[HuggingFace API exception]", e)
        return {"answer": "Sorry, I could not answer that right now. Please try again later."}
