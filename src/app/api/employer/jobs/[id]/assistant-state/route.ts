import { NextResponse } from "next/server";

import { getEmployerJobAssistantState } from "@/lib/employer/job-assistant-state";
import { getEmployerJob } from "@/lib/employer/jobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await getEmployerJob(supabase, data.user.id, id);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const assistantState = await getEmployerJobAssistantState(supabase, data.user.id, job.id);

  return NextResponse.json(assistantState);
}
