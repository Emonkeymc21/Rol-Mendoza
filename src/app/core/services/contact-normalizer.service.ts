import { Injectable } from '@angular/core';

export interface NormalizedContact {
  value: string;
  url: string;
}

const MENDOZA_AREA_CODES = ['2627', '2626', '2625', '2624', '2622', '261', '263', '260'];

@Injectable({ providedIn: 'root' })
export class ContactNormalizerService {
  normalizeWhatsapp(rawValue: string): NormalizedContact | null {
    let digits = (rawValue || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('54')) digits = digits.slice(2);
    if (digits.startsWith('9') && digits.length === 11) digits = digits.slice(1);
    digits = digits.replace(/^0+/, '');

    const areaCode = MENDOZA_AREA_CODES.find(code => digits.startsWith(code));
    if (areaCode && digits.slice(areaCode.length).startsWith('15')) {
      digits = areaCode + digits.slice(areaCode.length + 2);
    }

    if (!/^\d{10}$/.test(digits)) return null;
    const value = `549${digits}`;
    return { value, url: `https://wa.me/${value}` };
  }

  normalizeInstagram(rawValue: string): NormalizedContact | null {
    let username = (rawValue || '').trim().toLowerCase();
    username = username
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^www\.instagram\.com\//i, '')
      .split(/[/?#]/)[0]
      .replace(/^@+/, '')
      .trim();
    if (!username) return null;
    if (!/^[a-z0-9._]{1,30}$/.test(username)) return null;
    return { value: username, url: `https://www.instagram.com/${username}/` };
  }

  normalizeAlternatePhone(rawValue: string): string {
    return (rawValue || '').replace(/\D/g, '').slice(0, 15);
  }

  whatsappWithMessage(whatsappUrl: string, message: string): string {
    const baseUrl = String(whatsappUrl || '').trim().split('?')[0];
    const cleanMessage = String(message || '').trim();
    if (!/^https:\/\/wa\.me\/\d+$/.test(baseUrl)) return '';
    return cleanMessage ? `${baseUrl}?text=${encodeURIComponent(cleanMessage)}` : baseUrl;
  }
}
