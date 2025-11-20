import { Mascot } from '../../App';

interface MascotIllustrationProps {
  mascot: Mascot;
  color: string;
  size?: number;
  showSparkle?: boolean;
}

export function MascotIllustration({ mascot, color, size = 80, showSparkle = false }: MascotIllustrationProps) {
  const renderMascot = () => {
    switch (mascot) {
      case 'cat':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size}>
            <circle cx="50" cy="55" r="30" fill={color} />
            {/* Ears */}
            <path d="M 30 35 L 25 15 L 40 30 Z" fill={color} />
            <path d="M 70 35 L 75 15 L 60 30 Z" fill={color} />
            {/* Face */}
            <circle cx="42" cy="52" r="3" fill="#333" />
            <circle cx="58" cy="52" r="3" fill="#333" />
            <path d="M 45 60 Q 50 63 55 60" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="50" cy="58" r="2" fill="#FF69B4" />
            {/* Whiskers */}
            <line x1="30" y1="55" x2="20" y2="53" stroke="#333" strokeWidth="1.5" />
            <line x1="30" y1="58" x2="20" y2="60" stroke="#333" strokeWidth="1.5" />
            <line x1="70" y1="55" x2="80" y2="53" stroke="#333" strokeWidth="1.5" />
            <line x1="70" y1="58" x2="80" y2="60" stroke="#333" strokeWidth="1.5" />
          </svg>
        );
      
      case 'bunny':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size}>
            <circle cx="50" cy="55" r="28" fill={color} />
            {/* Ears */}
            <ellipse cx="38" cy="25" rx="8" ry="20" fill={color} />
            <ellipse cx="62" cy="25" rx="8" ry="20" fill={color} />
            <ellipse cx="38" cy="28" rx="4" ry="12" fill="#FFB6C1" opacity="0.6" />
            <ellipse cx="62" cy="28" rx="4" ry="12" fill="#FFB6C1" opacity="0.6" />
            {/* Face */}
            <circle cx="42" cy="52" r="3" fill="#333" />
            <circle cx="58" cy="52" r="3" fill="#333" />
            <circle cx="50" cy="60" r="2" fill="#FF69B4" />
            <path d="M 48 62 L 50 66 L 52 62" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Cheeks */}
            <circle cx="35" cy="58" r="5" fill="#FFB6C1" opacity="0.4" />
            <circle cx="65" cy="58" r="5" fill="#FFB6C1" opacity="0.4" />
          </svg>
        );
      
      case 'frog':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size}>
            <ellipse cx="50" cy="60" rx="32" ry="28" fill={color} />
            {/* Eyes */}
            <circle cx="38" cy="45" r="10" fill="white" />
            <circle cx="62" cy="45" r="10" fill="white" />
            <circle cx="38" cy="47" r="6" fill="#333" />
            <circle cx="62" cy="47" r="6" fill="#333" />
            <circle cx="40" cy="45" r="3" fill="white" />
            <circle cx="64" cy="45" r="3" fill="white" />
            {/* Mouth */}
            <path d="M 38 65 Q 50 70 62 65" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Spots */}
            <circle cx="30" cy="68" r="3" fill="#2D5F3F" opacity="0.3" />
            <circle cx="70" cy="68" r="3" fill="#2D5F3F" opacity="0.3" />
          </svg>
        );
      
      case 'bird':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size}>
            <circle cx="50" cy="55" r="28" fill={color} />
            {/* Wing */}
            <ellipse cx="70" cy="58" rx="12" ry="20" fill={color} opacity="0.8" />
            {/* Beak */}
            <path d="M 65 55 L 75 53 L 65 51 Z" fill="#FFA500" />
            {/* Eyes */}
            <circle cx="45" cy="50" r="4" fill="#333" />
            <circle cx="46" cy="49" r="2" fill="white" />
            {/* Cheek */}
            <circle cx="52" cy="60" r="4" fill="#FF69B4" opacity="0.5" />
            {/* Tail feathers */}
            <ellipse cx="28" cy="65" rx="8" ry="15" fill={color} opacity="0.7" transform="rotate(-20 28 65)" />
          </svg>
        );
      
      case 'fox':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size}>
            <circle cx="50" cy="58" r="26" fill={color} />
            {/* Ears */}
            <path d="M 32 38 L 28 18 L 42 35 Z" fill={color} />
            <path d="M 68 38 L 72 18 L 58 35 Z" fill={color} />
            <path d="M 32 35 L 35 25 L 38 33 Z" fill="white" />
            <path d="M 68 35 L 65 25 L 62 33 Z" fill="white" />
            {/* Snout */}
            <ellipse cx="50" cy="62" rx="14" ry="10" fill="white" />
            {/* Eyes */}
            <circle cx="43" cy="52" r="3" fill="#333" />
            <circle cx="57" cy="52" r="3" fill="#333" />
            {/* Nose */}
            <circle cx="50" cy="62" r="3" fill="#333" />
            <path d="M 47 65 Q 50 67 53 65" stroke="#333" strokeWidth="1.5" fill="none" />
          </svg>
        );
      
      case 'bear':
        return (
          <svg viewBox="0 0 100 100" width={size} height={size}>
            <circle cx="50" cy="55" r="28" fill={color} />
            {/* Ears */}
            <circle cx="32" cy="35" r="12" fill={color} />
            <circle cx="68" cy="35" r="12" fill={color} />
            <circle cx="32" cy="37" r="6" fill="#8B6F47" opacity="0.5" />
            <circle cx="68" cy="37" r="6" fill="#8B6F47" opacity="0.5" />
            {/* Snout */}
            <ellipse cx="50" cy="62" rx="12" ry="10" fill="#DEB887" opacity="0.7" />
            {/* Eyes */}
            <circle cx="42" cy="50" r="3" fill="#333" />
            <circle cx="58" cy="50" r="3" fill="#333" />
            {/* Nose */}
            <ellipse cx="50" cy="62" rx="4" ry="3" fill="#333" />
            <path d="M 48 64 L 50 68 L 52 64" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div className="relative inline-block">
      {renderMascot()}
      {showSparkle && (
        <div className="absolute -top-1 -right-1">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path d="M10 0 L11 9 L20 10 L11 11 L10 20 L9 11 L0 10 L9 9 Z" fill="#FFD700" />
          </svg>
        </div>
      )}
    </div>
  );
}

export { Mascot };
