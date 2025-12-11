import { ReactNode } from 'react';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { Shield } from 'lucide-react';
import { useI18n } from '@/i18n';

interface ScreenshotProtectionProps {
  children: ReactNode;
  enabled?: boolean;
}

/**
 * Component that protects its children from screenshots
 * - Blurs content when app goes to background
 * - Prevents text selection
 * - Adds CSS security layers
 */
export const ScreenshotProtection = ({ 
  children, 
  enabled = true 
}: ScreenshotProtectionProps) => {
  const { t } = useI18n();
  
  // TESTING MODE: Screenshot protection disabled for testing
  const isTestingMode = true;
  const isProtected = useScreenshotProtection(enabled && !isTestingMode);

  if (!enabled || isTestingMode) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {/* Main content with optional blur */}
      <div
        className={`transition-all duration-300 ${
          isProtected ? 'blur-2xl brightness-0' : ''
        }`}
      >
        {children}
      </div>

      {/* Protection overlay when content is hidden */}
      {isProtected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center text-white space-y-4">
            <Shield className="w-16 h-16 mx-auto text-red-500 animate-pulse" />
            <p className="text-xl font-bold">{t('screenshot_protection.protected_content')}</p>
            <p className="text-sm text-white/70">
              {t('screenshot_protection.return_to_app')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
