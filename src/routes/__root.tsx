import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { captureReferralFromUrl } from "@/lib/referral";
import { trackEvent } from "@/lib/analytics";
import { shouldTrackOAuthAuthentication } from "@/lib/auth-analytics";

const trackedOAuthAuthentication = new Set<string>();

// Not needed for first paint: loaded after the page is interactive so they stay
// out of the initial JavaScript that every visitor downloads.
const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
);
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((m) => ({ default: m.SpeedInsights })),
);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className¶»§q«^u¥…°µ…¹…•µ•¹Ð™½È™É••±…¹•ÉÌ°ÍÑ…ÉÑÕÁÌ°9=Ì°…¹Íµ…±°‰ÕÍ¥¹•ÍÍ•Ì¸É•…Ñ”¥¹Ù½¥•Ì°ÑÉ…¬•áÁ•¹Í•Ì°…¹É•Ù¥•Ü™¥¹…¹¥…°É•Á½ÉÑÌ¸MÑ…ÉÐÝ¥Ñ Ñ¡”É•”Á±…¸¸ˆ°(€€€€€ô°(€€€€€ì¹…µ”è€‰…ÕÑ¡½Èˆ°½¹Ñ•¹Ðè€‰¥¹±½ÜQÉ…¬ˆô°(€€€€€ì(€€€€€€€ÁÉ½Á•ÉÑäè€‰½œéÑ¥Ñ±”ˆ°(€€€€€€€½¹Ñ•¹Ðè€‰¥¹±½ÜQÉ…¬ƒŠP½Õ¹Ñ¥¹œ€˜¥¹…¹¥…°5…¹…•µ•¹Ð™½ÈMµ…±°	ÕÍ¥¹•ÍÍ•Ìˆ°(€€€€€ô°(€€€€€ì(€€€€€€€ÁÉ½Á•ÉÑäè€‰½œé‘•ÍÉ¥ÁÑ¥½¸ˆ°(€€€€€€€½¹Ñ•¹Ðè(€€€€€€€€€€‰½Õ¹Ñ¥¹œ…¹™¥¹…¹¥…°µ…¹…•µ•¹Ð™½È™É••±…¹•ÉÌ°ÍÑ…ÉÑÕÁÌ°9=Ì°…¹Íµ…±°‰ÕÍ¥¹•ÍÍ•Ì¸É•…Ñ”¥¹Ù½¥•Ì°ÑÉ…¬•áÁ•¹Í•Ì°…¹É•Ù¥•Ü™¥¹…¹¥…°É•Á½ÉÑÌ¸MÑ…ÉÐÝ¥Ñ Ñ¡”É•”Á±…¸¸ˆ°(€€€€€ô°(€€€€€ìÁÉ½Á•ÉÑäè€‰½œéÑåÁ”ˆ°½¹Ñ•¹Ðè€‰Ý•‰Í¥Ñ”ˆô°(€€€€€ì¹…µ”è€‰ÑÝ¥ÑÑ•Èé…Éˆ°½¹Ñ•¹Ðè€‰ÍÕµµ…Éå}±…É•}¥µ…”ˆô°(€€€€€ì(€€€€€€€¹…µ”è€‰ÑÝ¥ÑÑ•ÈéÑ¥Ñ±”ˆ°(€€€€€€€½¹Ñ•¹Ðè€‰¥¹±½ÜQÉ…¬ƒŠP½Õ¹Ñ¥¹œ€˜¥¹…¹¥…°5…¹…•µ•¹Ð™½ÈMµ…±°	ÕÍ¥¹•ÍÍ•Ìˆ°(€€€€€ô°(€€€€€ì(€€€€€€€¹…µ”è€‰ÑÝ¥ÑÑ•Èé‘•ÍÉ¥ÁÑ¥½¸ˆ°(€€€€€€€½¹Ñ•¹Ðè(€€€€€€€€€€‰½Õ¹Ñ¥¹œ…¹™¥¹…¹¥…°µ…¹…•µ•¹Ð™½È™É••±…¹•ÉÌ°ÍÑ…ÉÑÕÁÌ°9=Ì°…¹Íµ…±°‰ÕÍ¥¹•ÍÍ•Ì¸É•…Ñ”¥¹Ù½¥•Ì°ÑÉ…¬•áÁ•¹Í•Ì°…¹É•Ù¥•Ü™¥¹…¹¥…°É•Á½ÉÑÌ¸MÑ…ÉÐÝ¥Ñ Ñ¡”É•”Á±…¸¸ˆ°(€€€€€ô°(€€€€€ì(€€€€€€€ÁÉ½Á•ÉÑäè€‰½œé¥µ…”ˆ°(€€€€€€€½¹Ñ•¹Ðè(€€€€€€€€€€‰¡ÑÑÁÌè¼½ÍÑ½É…”¹½½±•…Á¥Ì¹½´½ÁÐµ•¹¥¹••Èµ™¥±”µÕÁ±½…‘Ì½-•©1©‰áQ	U•©¡¥1\ÙU!­-ÝÝ…QPÈ½Í½¥…°µ¥µ…•Ì½Í½¥…°´ÄÜàÐÄÐÌÀÀØÌàÐµ™…Ù¥½¸¹Ý•‰Àˆ°(€€€€€ô°(€€€€€ì(€€€€€€€¹…µ”è€‰ÑÝ¥ÑÑ•Èé¥µ…”ˆ°(€€€€€€€½¹Ñ•¹Ðè(€€€€€€€€€€‰¡ÑÑÁÌè¼½ÍÑ½É…”¹½½±•…Á¥Ì¹½´½ÁÐµ•¹¥¹••Èµ™¥±”µÕÁ±½…‘Ì½-•©1©‰áQ	U•©¡¥1\ÙUÚîÆ­y×VW'”6Æ–VçBÒÒ&÷WFRçW6U&÷WFT6öçFW‡B‚“°¢6öç7B&÷WFW"ÒW6U&÷WFW"‚“°¢òò&÷WFRGFW&â†f÷"W†×ÆR"ö&ÆöuòòG6ÇVr"’6òfW&6VÂ7VVB–ç6–v‡G26âw&÷W&VÂ×W6W ¢òò66÷&W2W"vR–ç7FVBöb6†÷v–ærWfW'’f—6—B2%Væ¶æ÷vâ"à¢6öç7B7VVE&÷WFRÒW6U&÷WFW%7FFR‡°¢6VÆV7C¢‡2’Óâ2æÖF6†W5·2æÖF6†W2æÆVæwF‚ÒÓòç&÷WFT–BÀ¢Ò“° ¢6öç7B¶FVfW'&VE&VG’Â6WDFVfW'&VE&VG•ÒÒW6U7FFR†fÇ6R“°¢W6TVffV7B‚‚’Óâ°¢6öç7BrÒv–æF÷r2v–æF÷rb°¢&WVW7D–FÆT6ÆÆ&6³ó¢†6#¢‚’Óâfö–BÂóó¢²F–ÖV÷WC¢çVÖ&W"Ò’ÓâçVÖ&W#°¢6æ6VÄ–FÆT6ÆÆ&6³ó¢†–C¢çVÖ&W"’Óâfö–C°¢Ó°¢6öç7BvòÒ‚’Óâ6WDFVfW'&VE&VG’‡G'VR“°¢–b‡rç&WVW7D–FÆT6ÆÆ&6²’°¢6öç7B–BÒrç&WVW7D–FÆT6ÆÆ&6²†vòÂ²F–ÖV÷WC¢#Ò“°¢&WGW&â‚’Óâræ6æ6VÄ–FÆT6ÆÆ&6³òâ†–B“°¢Ð¢6öç7BBÒv–æF÷rç6WEF–ÖV÷WB†vòÂS“°¢&WGW&â‚’Óâv–æF÷ræ6ÆV%F–ÖV÷WB‡B“°¢ÒÂµÒ“° ¢W6TVffV7B‚‚’Óâ°¢6öç7B²FFÒÒ7W&6RæWF‚æöäWF…7FFT6†ævR‚†WfVçBÂ6W76–öâ’Óâ°¢–b†WfVçBÓÓÒ%4”täTEô”â"bbv–æF÷ræÆö6F–öâçF†æÖRÓÓÒ"öWF‚"’°¢6öç7B&÷f–FW"Ò6W76–öãòçW6W#òæöÖWFFFòç&÷f–FW#°¢–b€¢G—Vöb&÷f–FW"ÓÓÒ'7G&–ær"b`¢&÷f–FW"ÓÒ&VÖ–Â"b`¢6†÷VÆEG&6´ôWF„WF†VçF–6F–öâ‡6W76–öãòçW6W#òæ–BÂ6W76–öãòæW‡—&W5öBÂG&6¶VDôWF„WF†VçF–6F–öâ¢’°¢òòF†R6ÆÆ&6²w2öÖöFSÒ&ÖWFW"—2æ÷B&ööböbæWr–FVçF—G’à¢òò&V6÷&BWF†VçF–6F–öâÂ'WBÆVfR6–vçW×g2ÖÆöv–â6Æ76–f–6F–öâVæ¶æ÷vâà¢G&6´[kºwµç