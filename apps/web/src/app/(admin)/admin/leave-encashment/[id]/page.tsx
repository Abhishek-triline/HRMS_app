'use client';

import { EncashmentDetailView } from '@/features/leave-encashment/components/EncashmentDetailView';

// Next.js 14 client components: `params` is a plain object, NOT a Promise.
// `React.use(params)` here used to fail with "An unsupported type was passed
// to use(): [object Object]" because params isn't a thenable.
interface Props {
  params: { id: string };
}

export default function AdminEncashmentDetailPage({ params }: Props) {
  return <EncashmentDetailView encashmentId={Number(params.id)} backHref="/admin/leave-encashment" />;
}
