export interface UserPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  isActive: boolean;
}

export interface UserSubscription {
  userId: number;
  planId: string;
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  features: string[];
}

export enum PremiumFeature {
  PROTECTED_NOTES = 'protected_notes',
  EMAIL_NOTIFICATIONS = 'email_notifications',
  PROTECTED_TRASH = 'protected_trash',
  UNLIMITED_NOTES = 'unlimited_notes',
  EXPORT_NOTES = 'export_notes',
  CUSTOM_THEMES = 'custom_themes',
  VOICE_ACCESS = 'voice_access'
}




