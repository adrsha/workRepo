import { useState } from "react";

export default function FullScreenableImage({ src, alt, className = "" }) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  return (
    <>
      <img 
        src={src} 
        alt={alt} 
        className={className + " previewImg"} 
        onClick={toggleFullScreen}
        style={{ cursor: 'pointer' }}
      />
      
      {isFullScreen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={toggleFullScreen}
        >
          <img 
            src={src} 
            alt={alt} 
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </>
  );
}
