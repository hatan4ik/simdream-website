'use client';

import React from 'react';
import {
  HomeHero,
  HomeRouteGate,
  HomeHowItWorks,
  HomeWhyUs,
  HomeFeaturedPackages,
  HomeCtaRibbon,
} from '@/components/home';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      <HomeHero />
      <HomeRouteGate />
      <HomeHowItWorks />
      <HomeWhyUs />
      <HomeFeaturedPackages />
      <HomeCtaRibbon />
    </div>
  );
}
