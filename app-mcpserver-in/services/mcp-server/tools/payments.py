"""UPI (Unified Payments Interface) VPA validation tool.

Validates VPA (Virtual Payment Address) format: user@handle
"""

import re
from typing import Dict, Any, Optional

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
    transaction_id: Optional[str] = None
) -> Dict[str, Any]:
    """Initiate a UPI payment (mock).
    
    In a real implementation, this would integrate with actual UPI APIs or payment gateways.
    
    Args:
        vpa: Virtual Payment Address of the recipient (e.g., user@okaxis)
        amount: Amount in INR
        note: Optional note for the transaction
        transaction_id: Optional external transaction ID (if not provided, a UUID is generated)
        
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
    
    # Mock processing - in reality, this would call a UPI gateway or bank API
    # For now, we simulate success or failure based on amount
    if amount <= 0:
        return {
            "success": False,
            "error": "Amount must be greater than zero",
            "transaction_id": transaction_id,
        }
    
    # Simulate occasional failure for demonstration
    # In a real system, this would depend on actual API responses
    import random
    if random.random() < 0.05:  # 5% failure rate
        return {
            "success": False,
            "error": "Insufficient funds or transaction declined by bank",
            "transaction_id": transaction_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    
    # Successful transaction
    return {
        "success": True,
        "transaction_id": transaction_id,
        "vpa": vpa,
        "amount": amount,
        "note": note,
        "status": "completed",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "fee": 0.0,  # UPI transactions are typically free
    }


def get_upi_transaction_status(transaction_id: str) -> Dict[str, Any]:
    """Get the status of a UPI transaction (mock).
    
    Args:
        transaction_id: The transaction ID to check
        
    Returns:
        Dictionary with transaction status
    """
    # Mock implementation - in reality, this would query the transaction status from the bank/UPI network
    return {
        "transaction_id": transaction_id,
        "status": "completed",  # or "pending", "failed"
        "timestamp": datetime.utcnow().isoformat() + "Z",
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
    import sys
    if len(sys.argv) > 1:
        vpa = sys.argv[1]
        result = validate_upi(vpa)
        if result["valid"]:
            print(f"✅ Valid UPI VPA")
            print(f"   VPA: {result['vpa']}")
            print(f"   User: {result['user']}")
            print(f"   Handle: {result['handle']}")
            print(f"   Type: {result['handle_type']}")
            if result["bank"]:
                print(f"   Bank: {result['bank']}")
        else:
            print(f"❌ Invalid UPI VPA")
            for error in result["errors"]:
                print(f"   Error: {error}")
    else:
        print("Usage: python -m tools.payments <vpa>")
        print("Example: python -m tools.payments user@okaxis")