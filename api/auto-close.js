import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

  try {

    const { data: activeClosing } = await supabase
      .from("active_closing")
      .select("*")
      .eq("id", 1)
      .single();

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .order("sort_order");

    // CASO 1: Existe cierre iniciado

    if (activeClosing?.started) {

      const pendingCount =
        tasks.filter(
          (task) => !task.completed
        ).length;

      const { data: closing } =
        await supabase
          .from("closings")
          .insert({
            responsible:
              activeClosing.responsible,
            notes:
              activeClosing.notes || "",
            pending_tasks:
              pendingCount,
            close_type:
              "automatic"
          })
          .select()
          .single();

      const closingTasks =
        tasks.map((task) => ({
          closing_id: closing.id,
          task_name: task.title,
          completed: task.completed
        }));

      await supabase
        .from("closing_tasks")
        .insert(closingTasks);
    }

    // CASO 2: No existe cierre

    else {

      const pendingCount =
        tasks.length;

      const { data: closing } =
        await supabase
          .from("closings")
          .insert({
            responsible:
              "Sin registrar",
            notes:
              "No se inició ningún cierre",
            pending_tasks:
              pendingCount,
            close_type:
              "missing"
          })
          .select()
          .single();

      const closingTasks =
        tasks.map((task) => ({
          closing_id: closing.id,
          task_name: task.title,
          completed: false
        }));

      await supabase
        .from("closing_tasks")
        .insert(closingTasks);
    }

    // Reiniciar checklist

    await supabase
      .from("tasks")
      .update({
        completed: false
      })
      .neq("id", 0);

    await supabase
      .from("active_closing")
      .update({
        responsible: null,
        notes: null,
        started: false
      })
      .eq("id", 1);

    return res.status(200).json({
      success: true
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}