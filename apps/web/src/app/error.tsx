'use client';
import { RequestFailure } from '@zhiqing/ui';
export default function ErrorPage({reset}: {reset:()=>void}) {return <RequestFailure retry={reset} />;}
