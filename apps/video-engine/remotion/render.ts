import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { UltraDynamicProps, CorporateProps, HybridTutorialProps } from './types';

const RENDERS_DIR = process.env['RENDERS_TMP_DIR'] ?? '/tmp/renders';
const entryPoint = path.join(__dirname, 'Root.tsx');

type CompositionMap = {
  UltraDynamic: UltraDynamicProps;
  Corporate: CorporateProps;
  HybridTutorial: HybridTutorialProps;
};

export async function renderComposition<K extends keyof CompositionMap>(
  compositionId: K,
  inputProps: CompositionMap[K],
  correlationId: string,
  durationInFrames: number,
): Promise<string> {
  const bundled = await bundle({ entryPoint, webpackOverride: (c) => c });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps,
  });

  const outputLocation = path.join(RENDERS_DIR, `${correlationId}_${compositionId}.mp4`);

  await renderMedia({
    composition: { ...composition, durationInFrames },
    serveUrl: bundled,
    codec: 'h264',
    outputLocation,
    inputProps,
    chromiumOptions: { disableWebSecurity: true },
  });

  return outputLocation;
}
