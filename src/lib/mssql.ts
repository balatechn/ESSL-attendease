// Phase 2: SQL Server biometric integration
// This module will be implemented when eSSL biometric device is connected

export interface BiometricPunch {
  UserId: string;
  LogDate: Date;
  Direction: string;
}

export async function fetchBiometricData(
  fromDate: string,
  toDate: string
): Promise<BiometricPunch[]> {
  console.log("[Phase 2] Biometric sync not configured yet");
  return [];
}

export async function fetchBiometricDataForUser(
  userId: string,
  fromDate: string,
  toDate: string
): Promise<BiometricPunch[]> {
  console.log("[Phase 2] Biometric sync not configured yet");
  return [];
}
