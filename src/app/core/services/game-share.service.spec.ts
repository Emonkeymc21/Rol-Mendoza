import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameShareService } from './game-share.service';
import { Game } from '../models/game.model';
describe('public game sharing', () => {
  afterEach(() => vi.unstubAllGlobals());
  const game = {id:'PRT-DEMO-BASE',title:'Mesa de prueba',system:'Fate',city:'Guaymallén',mode:'Presencial',status:'ACTIVE',seats:3} as Game;
  const service = new GameShareService(document);
  it('copies the same permanent link used by WhatsApp', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {clipboard:{writeText}});
    await service.copyLink(game.id);
    expect(writeText).toHaveBeenCalledWith(service.publicUrl(game.id));
    expect(decodeURIComponent(service.whatsappUrl(game))).toContain(service.publicUrl(game.id));
  });
  it('passes public metadata to the native Web Share API', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {share});
    expect(service.canUseNativeShare()).toBe(true);
    await service.nativeShare(game);
    expect(share).toHaveBeenCalledWith({title:'Mesa de prueba | Cumbre20',text:service.shareText(game),url:service.publicUrl(game.id)});
  });
  it('reports a missing native API without silently losing the share action', async () => {
    vi.stubGlobal('navigator', {});
    expect(service.canUseNativeShare()).toBe(false);
    await expect(service.nativeShare(game)).rejects.toThrow('no está disponible');
  });
});
