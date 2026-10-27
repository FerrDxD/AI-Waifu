'use client';

import { Deferred } from './deferred';

// Loader di scope modul (referensi stabil) supaya efek idle tidak diulang tiap
// render. QuestTracker dirender null & cuma mencatat kunjungan, jadi aman ditunda.
const loadQuestTracker = () => import('@/components/QuestTracker');

export default function DeferredQuestTracker() {
  return <Deferred loader={loadQuestTracker} />;
}
