import logoImage from '../assets/segro-logo-white.png';

export default function SegroLogo() {
  return (
    <div className="flex items-center flex-shrink-0">
      <img
        src={logoImage}
        alt="SEGRO"
        className="h-8 w-auto"
        style={{ maxWidth: '120px' }}
      />
    </div>
  );
}
