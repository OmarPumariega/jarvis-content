import React from 'react';
import { Composition } from 'remotion';
import { UltraDynamic, UltraDynamicPropsSchema } from './UltraDynamic';
import { Corporate, CorporatePropsSchema } from './Corporate';
import { HybridTutorial, HybridTutorialPropsSchema } from './HybridTutorial';

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="UltraDynamic"
        component={UltraDynamic}
        schema={UltraDynamicPropsSchema}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          videoSrc: '',
          title: 'Title',
          captions: [],
          accentColor: '#FF3D00',
          fps: 30,
        }}
      />

      <Composition
        id="Corporate"
        component={Corporate}
        schema={CorporatePropsSchema}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          videoSrc: '',
          title: 'Title',
          primaryColor: '#1A73E8',
          fps: 30,
        }}
      />

      <Composition
        id="HybridTutorial"
        component={HybridTutorial}
        schema={HybridTutorialPropsSchema}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          screenSrc: '',
          faceSrc: '',
          title: 'Tutorial',
          steps: [],
          fps: 30,
        }}
      />
    </>
  );
}
