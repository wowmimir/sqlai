import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

# Use HTTPBearer to automatically extract the "Authorization: Bearer <token>" header
security_scheme = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """
    Decodes the Clerk JWT and returns the clerk_user_id.
    """
    token = credentials.credentials
    
    try:
        # PyJWKClient automatically caches the JWKS keys from Clerk
        jwks_client = jwt.PyJWKClient(settings.CLERK_JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token).key
        
        # Verify the token
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            # In production, you should also verify 'aud' (audience) 
            # but for dev this is sufficient.
        )
        
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
            
        return {"clerk_user_id": clerk_user_id}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")