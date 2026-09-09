import logoIcon from '../assets/logo-ced-plan-icon.png';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 32, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logoIcon} alt="CEDPlan" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 object-contain" />
      {showText && (
        <span className="font-bold tracking-tight text-foreground" style={{ fontSize: size * 0.55 }}>
          CED<span className="text-blue-600">Plan</span>
        </span>
      )}
    </div>
  );
}
