import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const slug = searchParams.get('slug');

    if (slug) {
      const pkg = await store.getPackageBySlug(slug);
      if (!pkg) {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }
      return NextResponse.json(pkg);
    }

    let packages = await store.getPackages();
    if (category) {
      packages = packages.filter((p) => p.category === category);
    }

    return NextResponse.json(packages);
  } catch (error) {
    console.error('Package catalog lookup failed', error);
    return NextResponse.json({ error: 'The package catalog is temporarily unavailable.' }, { status: 503 });
  }
}

