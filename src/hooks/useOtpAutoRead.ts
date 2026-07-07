import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import {addListener, getOtp, removeListener} from 'react-native-otp-verify';

const extractOtp = (message: string, digits = 6) => {
  const match = message.match(new RegExp(`\\b(\\d{${digits}})\\b`));
  return match?.[1] ?? '';
};

type UseOtpAutoReadOptions = {
  digits?: number;
  enabled?: boolean;
  onOtpDetected?: (otp: string) => void;
};

export function useOtpAutoRead({
  digits = 6,
  enabled = true,
  onOtpDetected,
}: UseOtpAutoReadOptions = {}) {
  const onOtpDetectedRef = useRef(onOtpDetected);

  useEffect(() => {
    onOtpDetectedRef.current = onOtpDetected;
  }, [onOtpDetected]);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      return;
    }

    let cancelled = false;

    const handleMessage = (message: string) => {
      if (cancelled || message === 'Timeout Error.') {
        return;
      }

      const otp = extractOtp(message, digits);
      if (otp) {
        onOtpDetectedRef.current?.(otp);
      }
    };

    void (async () => {
      try {
        await getOtp();
        addListener(handleMessage);
      } catch {
        // Manual entry remains available if the SMS listener cannot start.
      }
    })();

    return () => {
      cancelled = true;
      removeListener();
    };
  }, [digits, enabled]);

  const restartListener = () => {
    if (Platform.OS !== 'android' || !enabled) {
      return;
    }

    removeListener();
    void (async () => {
      try {
        await getOtp();
        addListener(message => {
          const otp = extractOtp(message, digits);
          if (otp) {
            onOtpDetectedRef.current?.(otp);
          }
        });
      } catch {
        // no-op
      }
    })();
  };

  return {
    restartListener,
    isAndroidAutoRead: Platform.OS === 'android',
  };
}
