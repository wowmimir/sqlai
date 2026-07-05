import logging
from typing import List
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure once at module load
client = genai.Client(api_key=settings.GEMINI_API_KEY)

def get_embedding(text: str) -> List[float]:
    """
    Generate embedding for text using Google's text-embedding-2 model.
    
    Args:
        text: Input text to embed
        
    Returns:
        List of floats (1536-dimensional vector)
        
    Raises:
        RuntimeError: If embedding generation fails
    """
    try:
        result = client.models.embed_content(
            model="gemini-embedding-2",  # Latest stable embedding model
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=1536
            )
        )
        embedding = result.embeddings[0].values
        logger.debug(f"Generated embedding length: {len(embedding)} for text: {text[:50]}...")
        return embedding
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        raise RuntimeError(f"Embedding generation failed: {str(e)}")
    
