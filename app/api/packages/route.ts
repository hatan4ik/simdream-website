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
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

