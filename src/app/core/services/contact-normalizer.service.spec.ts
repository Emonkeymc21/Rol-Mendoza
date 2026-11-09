import { describe, expect, it } from 'vitest';
import { ContactNormalizerService } from './contact-normalizer.service';
describe('contact normalization', () => {
  const service = new ContactNormalizerService();
  it.each(['0261 15 5551234', '+54 9 261 5551234', '2615551234'])('normalizes %s consistently', value => {
    expect(service.normalizeWhatsapp(value)).toEqual({value:'5492615551234',url:'https://wa.me/5492615551234'});
  });
  it('rejects incomplete telephone numbers', () => expect(service.normalizeWhatsapp('123')).toBeNull());
  it('normalizes Instagram URLs without query parameters', () => {
    expect(service.normalizeInstagram('https://www.instagram.com/Cumbre20.mza/?source=share')?.value).toBe('cumbre20.mza');
  });
  it('does not turn executable input into a contact link', () => {
    expect(service.normalizeInstagram('javascript:alert(1)')).toBeNull();
    expect(service.whatsappWithMessage('javascript:alert(1)', 'hola')).toBe('');
  });
  it('encodes a message on an approved WhatsApp URL', () => {
    expect(service.whatsappWithMessage('https://wa.me/5492615551234?old=1','Mesa & rol'))
      .toBe('https://wa.me/5492615551234?text=Mesa%20%26%20rol');
  });
});
