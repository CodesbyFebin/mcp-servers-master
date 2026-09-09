"""UPI Payment Initiation Tool with Sandbox API Integration.
 
Provides a real interface for initiating UPI payments using sandbox APIs
from providers like Razorpay, Paytm, or PhonePe for testing purposes.
In production, this would connect to actual UPI gateways or bank APIs.
"""

import os
import json
import hashlib
import hmac
import uuid
from typing import Dict, Any, Optional
import requests
from datetime import datetime


def _generate_idempotency_key() -> str:
    """Generate a unique idempotency key for UPI transactions."""
    return str(uuid.uuid4())


def _sign_request(data: dict, secret_key: str) -> str:
    """Create HMAC SHA256 signature for request verification."""
    message = json.dumps(data, separators=(',', ':'))
    return hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


def initiate_upi_payment(
    vpa: str,
    amount: float,
    note: str = "",
    transaction_id: Optional[str] = None,
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """Initiate a UPI payment using sandbox API.
    
    Integrates with RBI-regulated sandbox APIs (e.g., Razorpay UPI Sandbox,
    NPCI UPI Sandbox, Paytm/Paytm/UPI sandbox) for real testing without
    real money movement.
    
    Args:
        vpa: Virtual Payment Address of the recipient (e.g., user@okaxis)
        amount: Amount in INR
        note: Optional note for the transaction
        transaction_id: Optional external transaction ID (if not provided, a UUID is generated)
        idempotency_key: Optional idempotency key to prevent duplicate charges
        
    Returns:
        Dictionary with transaction status and details
    """
    # Validate VPA format (simple check)
    if not vpa or "@" not in vpa:
        return {
            "success": False,
            "error": "Invalid VPA format",
            "transaction_id": None,
        }
    
    # Generate transaction ID if not provided
    if not transaction_id:
        transaction_id = str(uuid.uuid4())
    
    # Generate idempotency key if not provided
    if not idempotency_key:
        idempotency_key = _generate_idempotency_key()
    
    # Validate amount
    if amount <= 0:
        return {
            "success": False,
            "error": "Amount must be greater than zero",
            "transaction_id": transaction_id,
        }
    
    # Maximum amount check (UPI limits vary, typically ₹1 lakh per transaction)
    if amount > 100000:
        return {
            "success": False,
            "error": "Amount exceeds UPI transaction limit (₹1,00,000)",
            "transaction_id": transaction_id,
        }
    
    # Prepare payload for sandbox API
    # Using Razorpay UPI Sandbox as example - in production, use actual UPI PSP
    payload = {
        "amount": int(amount * 100),  # Amount in paise
        "currency": "INR",
        "accept": {
            "method": "upi",
            "vpa": vpa
        },
        "reference_id": transaction_id,
        "description": note or "UPI Payment via MCP Server",
        "customer": {
            "name": "AI Agent User",
            "email": "user@example.com",
            "contact": "+910000000000"
        },
        "notes": {
            "mcp_transaction_id": transaction_id,
            "mcp_timestamp": datetime.utcnow().isoformat() + "Z",
            "mcp_source": "app.mcpserver.in"
        }
    }
    
    # Get sandbox API credentials from environment
    api_key = os.environ.get("UPI_SANDBOX_API_KEY", "test_key")
    api_secret = os.environ.get("UPI_SANDBOX_API_SECRET", "test_secret")
    sandbox_url = os.environ.get("UPI_SANDBOX_URL", "https://sandbox.razorpay.com/v1/payment_links")
    
    try:
        # Create signature for request verification
        signature = _sign_request(payload, api_secret)
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "X-Razorpay-Signature": signature,
            "X-Idempotency-Key": idempotency_key,
            "User-Agent": "MCP-Server-UPI/1.0"
        }
        
        # Make request to sandbox API
        response = requests.post(
            sandbox_url,
            json=payload,
            headers=headers,
            timeout=10  # 10 second timeout
        )
        
        if response.status_code not in [200, 201]:
            error_msg = f"Sandbox API returned {response.status_code}"
            try:
                error_data = response.json()
                error_msg += f": {error_data.get('error', {}).get('description', response.text)}"
            except:
                error_msg += f": {response.text}"
            
            return {
                "success": False,
                "error": error_msg,
                "transaction_id": transaction_id,
                "idempotency_key": idempotency_key
            }
        
        # Parse successful response
        result = response.json()
        
        # Extract relevant information from sandbox response
        sandbox_response = {
            "success": True,
            "transaction_id": transaction_id,
            "idempotency_key": idempotency_key,
            "vpa": vpa,
            "amount": amount,
            "note": note,
            "status": "created",  # Payment link created, awaiting user action
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "payment_url": result.get("short_url"),  # URL for user to complete payment
            "upi_intent_url": result.get("upi_intent_url"),  # Direct UPI intent URL if available
            "expires_at": result.get("expires_at"),  # When payment link expires
            "fee": 0.0,  # UPI transactions are typically free
            "sandbox_mode": True
        }
        
        return sandbox_response
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "Request to UPI sandbox timed out",
            "transaction_id": transaction_id,
            "idempotency_key": idempotency_key
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Network error: {str(e)}",
            "transaction_id": transaction_id,
            "idempotency_key": idempotency_key
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "transaction_id": transaction_id,
            "idempotency_key": idempotency_key
        }


def get_upi_transaction_status(transaction_id: str) -> Dict[str, Any]:
    """Get the status of a UPI transaction using sandbox API.
    
    Args:
        transaction_id: The transaction ID to check
        
    Returns:
        Dictionary with transaction status
    """
    if not transaction_id:
        return {
            "transaction_id": "",
            "status": "invalid",
            "error": "Transaction ID is required"
        }
    
    # Get sandbox API credentials from environment
    api_key = os.environ.get("UPI_SANDBOX_API_KEY", "test_key")
    api_secret = os.environ.get("UPI_SANDBOX_API_SECRET", "test_secret")
    sandbox_url = os.environ.get("UPI_SANDBOX_URL", "https://sandbox.razorpay.com/v1/payment_links")
    
    try:
        # Make request to check transaction status
        url = f"{sandbox_url}/{transaction_id}"
        
        # Create signature (though for GET requests, some APIs don't require it)
        signature = _sign_request({"transaction_id": transaction_id}, api_secret)
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "X-Razorpay-Signature": signature,
            "User-Agent": "MCP-Server-UPI/1.0"
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return {
                "transaction_id": transaction_id,
                "status": "unknown",
                "error": f"Failed to fetch status: {response.status_code}"
            }
        
        result = response.json()
        
        # Map sandbox status to our standard status
        status_mapping = {
            "created": "pending",
            "authorized": "pending",
            "captured": "completed",
            "refunded": "refunded",
            "failed": "failed",
            "cancelled": "cancelled",
            "expired": "expired"
        }
        
        api_status = result.get("status", "").lower()
        mapped_status = status_mapping.get(api_status, api_status)
        
        return {
            "transaction_id": transaction_id,
            "status": mapped_status,
            "amount": result.get("amount", 0) / 100 if result.get("amount") else 0,
            "currency": result.get("currency", "INR"),
            "created_at": result.get("created_at"),
            "expires_at": result.get("expires_at"),
            "payment_url": result.get("short_url"),
            "upi_intent_url": result.get("upi_intent_url"),
            "sandbox_mode": True,
            "metadata": result.get("notes", {})
        }
        
    except requests.exceptions.Timeout:
        return {
            "transaction_id": transaction_id,
            "status": "unknown",
            "error": "Request to UPI sandbox timed out"
        }
    except requests.exceptions.RequestException as e:
        return {
            "transaction_id": transaction_id,
            "status": "unknown",
            "error": f"Network error: {str(e)}"
        }
    except Exception as e:
        return {
            "transaction_id": transaction_id,
            "status": "unknown",
            "error": f"Unexpected error: {str(e)}"
        }


def validate_upi(vpa: str) -> Dict[str, Any]:
    """Validate a UPI VPA (Virtual Payment Address).
    
    Format: user@handle
    - user: alphanumeric, can contain dots, underscores, hyphens
    - handle: recognized UPI handle suffixes
    
    Args:
        vpa: UPI VPA string (e.g., user@okaxis)
        
    Returns:
        Dictionary with validation result and handle information
    """
    result: Dict[str, Any] = {
        "valid": False,
        "vpa": vpa,
        "user": None,
        "handle": None,
        "handle_type": None,
        "bank": None,
        "errors": []
    }
    
    # VPA format: user@handle
    # user: alphanumeric with . _ - allowed
    # handle: @okaxis, @upi, @paytm, etc.
    upi_pattern = r"^([a-zA-Z0-9._-]+)@([a-zA-Z0-9]+)$"
    
    import re
    match = re.match(upi_pattern, vpa)
    if not match:
        result["errors"].append(f"Invalid VPA format — expected user@handle, got: {vpa}")
        return result
    
    user = match.group(1)
    handle = match.group(2)
    
    result["vpa"] = vpa
    result["user"] = user
    result["handle"] = "@" + handle
    
    # Determine handle type
    handle_types: Dict[str, str] = {
        "okaxis": "Axis Bank",
        "icici": "ICICI Bank",
        "sbi": "State Bank of India",
        "hdfc": "HDFC Bank",
        "paytm": "Paytm",
        "phonepe": "PhonePe",
        "googlepay": "Google Pay",
        "upi": "Generic UPI",
        "yz": "Yes Bank",
        "kotak": "Kotak Mahindra Bank",
        "axis": "Axis Bank",
    }
    
    result["handle_type"] = handle_types.get(handle.lower(), f"Custom handle: @{handle}")
    
    # Try to extract bank name from handle
    bank_map: Dict[str, str] = {
        "okaxis": "Axis Bank",
        "icici": "ICICI Bank",
        "sbi": "State Bank of India",
        "hdfc": "HDFC Bank",
        "paytm": "Paytm Payments Bank",
        "phonepe": "PhonePe Payments Services",
        "googlepay": "Google Payments",
    }
    
    result["bank"] = bank_map.get(handle.lower())
    
    result["valid"] = True
    return result


def validate_vpa_pattern(vpa: str, allowed_handles: list[str] | None = None) -> Dict[str, Any]:
    """Validate VPA against a list of allowed handles."""
    result = validate_upi(vpa)
    if not result["valid"]:
        return result
    
    if allowed_handles:
        handle_lower = result["handle"].lower().replace("@", "")
        if handle_lower not in [h.lower() for h in allowed_handles]:
            result["errors"].append(f"Handle @{handle_lower} not in allowed list")
            result["valid"] = False
    
    return result


# Example usage for testing
if __name__ == "__main__":
    # Example: Initiate a payment
    result = initiate_upi_payment("user@okaxis", 100.0, "Test payment via MCP")
    print("UPI Payment Initiation Result:")
    print(json.dumps(result, indent=2))
    
    if result.get("success"):
        # Check status
        status_result = get_upi_transaction_status(result["transaction_id"])
        print("\nTransaction Status:")
        print(json.dumps(status_result, indent=2))