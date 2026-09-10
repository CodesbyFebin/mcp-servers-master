import hashlib
import hmac
import json
import uuid
import time
import requests
from typing import Dict, Any, Optional
import os
from datetime import datetime

class UPIPaymentService:
    def __init__(self):
        self.api_key = os.getenv("UPI_SANDBOX_API_KEY")
        self.api_secret = os.getenv("UPI_SANDBOX_API_SECRET")
        self.base_url = os.getenv("UPI_SANDBOX_URL", "https://sandbox.razorpay.com/v1/payment_links")
        self.sandbox_mode = True  # Toggle for production

    def _generate_idempotency_key(self) -> str:
        """Generate unique idempotency key to prevent duplicate charges"""
        return str(uuid.uuid4())

    def _sign_request(self, method: str, path: str, body: Dict[str, Any]) -> str:
        """Generate HMAC-SHA256 signature for API authentication"""
        message = f"{method}\n{path}\n{json.dumps(body, sort_keys=True)}"
        signature = hmac.new(
            self.api_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature

    def initiate_upi_payment(
        self, 
        amount: float, 
        currency: str = "INR", 
        customer_vpa: str = None, 
        customer_phone: str = None,
        customer_name: str = None,
        idempotency_key: str = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Initiate UPI payment via Razorpay Sandbox
        Returns payment URL, UPI intent, and transaction ID
        """
        if not self.api_key or not self.api_secret:
            return {
                "success": False,
                "error": "UPI sandbox credentials not configured",
                "code": "MISSING_CREDENTIALS"
            }

        if idempotency_key:
            key = idempotency_key
        else:
            key = self._generate_idempotency_key()

        # Validate amount (UPI max limit check)
        if amount > 100000:
            return {
                "success": False,
                "error": "Amount exceeds UPI limit of ₹100,000",
                "code": "AMOUNT_TOO_HIGH"
            }

        if amount <= 0:
            return {
                "success": False,
                "error": "Amount must be greater than zero",
                "code": "INVALID_AMOUNT"
            }

        payload = {
            "amount": int(amount * 100),  # Convert to paise
            "currency": currency,
            "customer": {
                "vpa": customer_vpa,
                "phone": customer_phone,
                "name": customer_name
            },
            "metadata": metadata or {}
        }

        path = "/payment_links"
        signature = self._sign_request("POST", path, payload)
        
        headers = {
            "Authorization": f"Basic {self.api_key}:{self.api_secret}",
            "Content-Type": "application/json",
            "X-Razorpay-Idempotency-Key": key
        }

        try:
            response = requests.post(
                f"{self.base_url}{path}",
                json=payload,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            
            return {
                "success": True,
                "transaction_id": data.get("id"),
                "payment_url": data.get("short_url", ""),
                "upi_intent": f"upi://pay?pa={customer_vpa}&pn={customer_name}&am={amount}&cu=INR",
                "expires_at": data.get("expires_at"),
                "sandbox_mode": self.sandbox_mode,
                "created_at": data.get("created_at")
            }

        except requests.exceptions.Timeout:
            return {"success": False, "error": "Payment gateway timeout", "code": "TIMEOUT"}
        except requests.exceptions.HTTPError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except:
                error_data = {"description": e.response.text}
            return {
                "success": False, 
                "error": error_data.get("error", {}).get("description", str(e)),
                "code": "API_ERROR"
            }
        except Exception as e:
            return {"success": False, "error": str(e), "code": "INTERNAL_ERROR"}

    def get_upi_transaction_status(self, transaction_id: str) -> Dict[str, Any]:
        """Check transaction status via API"""
        if not transaction_id:
            return {"success": False, "error": "Transaction ID is required", "code": "MISSING_TRANSACTION_ID"}
            
        if not self.api_key or not self.api_secret:
            return {
                "success": False,
                "error": "UPI sandbox credentials not configured",
                "code": "MISSING_CREDENTIALS"
            }

        path = f"/payment_links/{transaction_id}"
        
        try:
            response = requests.get(
                f"{self.base_url}{path}",
                headers={
                    "Authorization": f"Basic {self.api_key}:{self.api_secret}"
                },
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Map Razorpay status to standard status
            status_mapping = {
                "created": "pending",
                "authorized": "pending",
                "paid": "completed",
                "captured": "completed",
                "refunded": "refunded",
                "failed": "failed",
                "cancelled": "cancelled",
                "expired": "expired"
            }
            
            api_status = data.get("status", "").lower()
            mapped_status = status_mapping.get(api_status, api_status)
            
            return {
                "success": True,
                "status": mapped_status,
                "amount": data.get("amount", 0) / 100 if data.get("amount") else 0,
                "currency": data.get("currency", "INR"),
                "customer": data.get("customer", {}),
                "created_at": data.get("created_at"),
                "expires_at": data.get("expires_at"),
                "sandbox_mode": self.sandbox_mode
            }
        except requests.exceptions.Timeout:
            return {"success": False, "error": "Payment gateway timeout", "code": "TIMEOUT"}
        except requests.exceptions.HTTPError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except:
                error_data = {"description": e.response.text}
            return {
                "success": False, 
                "error": error_data.get("error", {}).get("description", str(e)),
                "code": "API_ERROR"
            }
        except Exception as e:
            return {"success": False, "error": str(e), "code": "STATUS_ERROR"}

# Singleton instance
upi_service = UPIPaymentService()

# Legacy function wrappers for backward compatibility
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
    import re
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


def initiate_upi_payment(
    vpa: str,
    amount: float,
    note: str = "",
    transaction_id: Optional[str] = None,
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """Initiate a UPI payment using sandbox API.
    
    Wrapper function for backward compatibility with existing MCP server interface.
    
    Args:
        vpa: Virtual Payment Address of the recipient (e.g., user@okaxis)
        amount: Amount in INR
        note: Optional note for the transaction
        transaction_id: Optional external transaction ID (if not provided, a UUID is generated)
        idempotency_key: Optional idempotency key to prevent duplicate charges
        
    Returns:
        Dictionary with transaction status and details
    """
    # Note: For sandbox, we're using the VPA as customer_vpa
    # In a real implementation, you might want to separate payer vs payee VPA
    result = upi_service.initiate_upi_payment(
        amount=amount,
        customer_vpa=vpa,
        customer_name="MCP User",
        idempotency_key=idempotency_key,
        metadata={"note": note, "transaction_id": transaction_id or "generated"}
    )
    
    # Add the VPA and note to the result for consistency with previous interface
    if result.get("success"):
        result["vpa"] = vpa
        result["note"] = note
        if transaction_id:
            result["transaction_id"] = transaction_id
            
    return result


def get_upi_transaction_status(transaction_id: str) -> Dict[str, Any]:
    """Get the status of a UPI transaction using sandbox API.
    
    Wrapper function for backward compatibility with existing MCP server interface.
    
    Args:
        transaction_id: The transaction ID to check
        
    Returns:
        Dictionary with transaction status
    """
    result = upi_service.get_upi_transaction_status(transaction_id)
    
    # Format response to match previous interface
    if result.get("success"):
        return {
            "transaction_id": transaction_id,
            "status": result.get("status", "unknown"),
            "timestamp": result.get("created_at", datetime.utcnow().isoformat() + "Z"),
            "amount": result.get("amount"),
            "currency": result.get("currency"),
            "customer": result.get("customer")
        }
    else:
        return {
            "transaction_id": transaction_id,
            "status": "unknown",
            "error": result.get("error", "Unknown error"),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }


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


# Example usage
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