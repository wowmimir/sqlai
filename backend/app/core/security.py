import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from cachetools import TTLCache

# Use HTTPBearer to automatically extract the "Authorization: Bearer <token>" header
security_scheme = HTTPBearer()

_token_cache = TTLCache(maxsize=500, ttl=300)

def verify_token(token : str)-> dict:

    try:
        # PyJWKClient automatically caches the JWKS keys from Clerk
        jwks_client = jwt.PyJWKClient(settings.CLERK_JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token).key
        
        # Verify the token
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"]
            # In production, you should also verify 'aud' (audience) 
            # but for dev this is sufficient.
        )
        
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise ValueError(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
            
        return {"clerk_user_id": clerk_user_id}
        
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.PyJWTError as e:
        raise ValueError(f"Invalid token: {str(e)}")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """
    Decodes the Clerk JWT and returns the clerk_user_id.
    """
    token = credentials.credentials

    cached = _token_cache.get(token)

    if cached:
        return cached
    
    try:
        user_data = verify_token(token)
        _token_cache[token] = user_data
        return user_data
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    