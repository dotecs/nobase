import {it,expect} from 'vitest';
import {shouldReplaceAudioSource} from './audio-source';
const playing={currentSentence:'s1',nextSentence:'s1',currentUrl:'https://audio.test/a.mp3?token=old',nextUrl:'https://audio.test/a.mp3?token=new',playing:true,failed:false};
it('keeps a playing sentence loaded when only its signature changes',()=>{expect(shouldReplaceAudioSource(playing)).toBe(false);});
it('applies the latest signature once paused',()=>{expect(shouldReplaceAudioSource({...playing,playing:false})).toBe(true);});
it('loads the refreshed URL when moving to another sentence',()=>{expect(shouldReplaceAudioSource({...playing,nextSentence:'s2'})).toBe(true);});
it.each(['https://audio.test/b.mp3?token=new','https://other.test/a.mp3?token=new','https://audio.test/a.mp3?token=new#different'])('replaces a genuinely different resource: %s',nextUrl=>{expect(shouldReplaceAudioSource({...playing,nextUrl})).toBe(true);});
it('allows an error recovery refresh even while playback is requested',()=>{expect(shouldReplaceAudioSource({...playing,failed:true})).toBe(true);});
it('still handles missing sources and unchanged sources',()=>{expect(shouldReplaceAudioSource({...playing,currentUrl:undefined})).toBe(true);expect(shouldReplaceAudioSource({...playing,nextUrl:undefined})).toBe(true);expect(shouldReplaceAudioSource({...playing,nextUrl:playing.currentUrl})).toBe(false);});
