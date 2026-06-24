import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const ADMIN_PASSWORD = "1234";

function App() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSection, setAdminSection] = useState("");
  const [screen, setScreen] = useState("home");

  const [newTitle, setNewTitle] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [responsible, setResponsible] = useState("");
  const [closingStarted, setClosingStarted] = useState(false);
  const [notes, setNotes] = useState("");
  const [showExistingClosing, setShowExistingClosing] = useState(false);
  const [changingResponsible, setChangingResponsible] = useState(false);
  const [selectedResponsible, setSelectedResponsible] = useState("");
  const [newEmployee, setNewEmployee] = useState("");
  const [closings, setClosings] = useState([]);
  const [selectedClosing, setSelectedClosing] = useState(null);
  const [closingDetails, setClosingDetails] = useState([]);
  const [forgottenTasks, setForgottenTasks] = useState({});
  const [openedEmployee, setOpenedEmployee] = useState(null);
  const [taskIncidents, setTaskIncidents] = useState({});
  const [lastClosing, setLastClosing] = useState(null);
const [openingEmployee, setOpeningEmployee] = useState("");
const [openingTasks, setOpeningTasks] = useState([]);

  // --- Carga de datos ---

  async function loadClosings() {

  const { data } = await supabase
    .from("closings")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  setClosings(data || []);
  
}

  async function loadLastClosing() {

  const { data: closing } =
    await supabase
      .from("closings")
      .select("*")
      .order("created_at", {
        ascending: false
      })
      .limit(1)
      .single();

  if (!closing) return;

  setLastClosing(closing);

  const { data: tasks } =
    await supabase
      .from("closing_tasks")
      .select("*")
      .eq(
        "closing_id",
        closing.id
      );

  setOpeningTasks(tasks || []);
}

  async function loadForgottenTasks() {

  const { data: closings } = await supabase
    .from("closings")
    .select("id,responsible");

  const { data: tasks } = await supabase
    .from("closing_tasks")
    .select("*");

  const stats = {};

  tasks.forEach((task) => {

    if (task.completed) return;

    const closing = closings.find(
      (c) => c.id === task.closing_id
    );

    if (!closing) return;

    const employee =
      closing.responsible;

    if (!stats[employee]) {
      stats[employee] = {};
    }

    if (!stats[employee][task.task_name]) {
      stats[employee][task.task_name] = 0;
    }

    stats[employee][task.task_name]++;
  });

  setForgottenTasks(stats);
}

  async function viewClosing(id) {

  if (selectedClosing === id) {
    setSelectedClosing(null);
    setClosingDetails([]);
    return;
  }

  const { data } = await supabase
    .from("closing_tasks")
    .select("*")
    .eq("closing_id", id);

  setClosingDetails(data || []);
  setSelectedClosing(id);
}

  async function addEmployee() {
  if (!newEmployee.trim()) return;

  await supabase
    .from("employees")
    .insert({
      name: newEmployee,
      active: true
    });

  setNewEmployee("");
  loadEmployees();
}

  async function deactivateEmployee(id) {
  await supabase
    .from("employees")
    .update({
      active: false
    })
    .eq("id", id);

  loadEmployees();
}

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("sort_order");
    setTasks(data || []);
  }

  async function loadEmployees() {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("active", true)
      .order("name");
    setEmployees(data || []);
  }

  async function loadActiveClosing() {
    const { data } = await supabase
      .from("active_closing")
      .select("*")
      .eq("id", 1)
      .single();

    if (data?.started) {
  setResponsible(data.responsible || "");
  setNotes(data.notes || "");
  setShowExistingClosing(true);
}
  }

  // --- Tareas ---

  async function toggleTask(task) {
    const newValue = !task.completed;
    await supabase
      .from("tasks")
      .update({ completed: newValue })
      .eq("id", task.id);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, completed: newValue } : t
      )
    );
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    await supabase.from("tasks").insert({
      title: newTitle,
      instructions: newInstructions,
      completed: false,
      sort_order: tasks.length + 1,
    });
    setNewTitle("");
    setNewInstructions("");
    loadTasks();
  }

  async function deleteTask(id) {
    const confirmar = window.confirm("¿Eliminar esta tarea?");
    if (!confirmar) return;
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  }

  async function editTask(task) {
    const nuevoTitulo = prompt("Nuevo título", task.title);
    if (!nuevoTitulo) return;
    const nuevasInstrucciones = prompt(
      "Nuevas instrucciones",
      task.instructions || ""
    );
    await supabase
      .from("tasks")
      .update({ title: nuevoTitulo, instructions: nuevasInstrucciones })
      .eq("id", task.id);
    loadTasks();
  }

  async function moveTaskUp(task) {
  const index = tasks.findIndex(
    (t) => t.id === task.id
  );

  if (index === 0) return;

  const currentTask = tasks[index];
  const previousTask = tasks[index - 1];

  await supabase
    .from("tasks")
    .update({
      sort_order: previousTask.sort_order,
    })
    .eq("id", currentTask.id);

  await supabase
    .from("tasks")
    .update({
      sort_order: currentTask.sort_order,
    })
    .eq("id", previousTask.id);

  loadTasks();
}

async function moveTaskDown(task) {
  const index = tasks.findIndex(
    (t) => t.id === task.id
  );

  if (index === tasks.length - 1) return;

  const currentTask = tasks[index];
  const nextTask = tasks[index + 1];

  await supabase
    .from("tasks")
    .update({
      sort_order: nextTask.sort_order,
    })
    .eq("id", currentTask.id);

  await supabase
    .from("tasks")
    .update({
      sort_order: currentTask.sort_order,
    })
    .eq("id", nextTask.id);

  loadTasks();
}

  // --- Cierre ---

  async function finishClosing() {
    if (!responsible) return;

    const pendingCount = tasks.filter(
  (task) => !task.completed
).length;

    const pendingTasks = tasks.filter((task) => !task.completed);
    if (pendingTasks.length > 0) {
      const taskList = pendingTasks.map((t) => `• ${t.title}`).join("\n");
      const confirmClose = window.confirm(
        `Quedan ${pendingTasks.length} tareas pendientes:\n\n${taskList}\n\n¿Finalizar igualmente el cierre?`
      );
      if (!confirmClose) return;
    }

    const { data: closingData, error } =
  await supabase
    .from("closings")
    .insert({
      responsible,
      notes,
      pending_tasks: pendingCount,
      close_type: "manual"
    })
      .select()
      .single();

    if (error) {
      alert("Error guardando cierre");
      return;
    }

    const closingId = closingData.id;
    console.log(taskIncidents);

    const closingTasks = tasks.map((task) => ({
  closing_id: closingId,
  task_name: task.title,
  completed: task.completed,
  incident:
    taskIncidents[task.id] || null
}));
console.log(closingTasks);
    const { error: insertError } = await supabase
  .from("closing_tasks")
  .insert(closingTasks);

if (insertError) {
  alert(insertError.message);
}
    await supabase
      .from("tasks")
      .update({ completed: false, employee: null })
      .neq("id", 0);
    await supabase
      .from("active_closing")
      .update({ responsible: null, notes: null, started: false })
      .eq("id", 1);

    setTaskIncidents({});
    setResponsible("");
    setNotes("");
    setClosingStarted(false);
    setShowExistingClosing(false);
    setScreen("home");
    alert("Cierre guardado");
  }

  // --- Efectos ---

  useEffect(() => {
    loadTasks();
    loadEmployees();
    loadActiveClosing();

    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => { loadTasks(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Render ---

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "auto",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h1>Checklist Diaria</h1>

      {/* PANTALLA HOME */}
      {screen === "home" && (
        <div>
          <button
  onClick={() => {
    if (showExistingClosing) {
      return;
    }

    setScreen("closing");
  }}
  style={{
    width: "100%",
    padding: "20px",
    marginBottom: "15px",
    fontSize: "18px",
  }}
>
  📝 Cierre diario
</button>
{showExistingClosing && (
  <div
    style={{
      border: "2px solid orange",
      borderRadius: "10px",
      padding: "15px",
      marginBottom: "15px"
    }}
  >
    <h3>
      ⚠️ Existe un cierre iniciado por {responsible}
    </h3>

    <button
      onClick={() => {
        setClosingStarted(true);
        setScreen("closing");
      }}
      style={{
        width: "100%",
        padding: "10px",
        marginBottom: "10px"
      }}
    >
      Continuar cierre
    </button>

    <button
  onClick={() => {
    setChangingResponsible(true);
  }}
  style={{
    width: "100%",
    padding: "10px"
  }}
>
  Cambiar responsable
</button>

{changingResponsible && (
  <div
    style={{
      marginTop: "15px"
    }}
  >
    <select
      value={selectedResponsible}
      onChange={(e) =>
        setSelectedResponsible(
          e.target.value
        )
      }
      style={{
        width: "100%",
        padding: "10px",
        marginBottom: "10px"
      }}
    >
      <option value="">
        Seleccionar empleado...
      </option>

      {employees.map((emp) => (
        <option
          key={emp.id}
          value={emp.name}
        >
          {emp.name}
        </option>
      ))}
    </select>

    <button
      onClick={async () => {
        if (!selectedResponsible)
          return;

        await supabase
          .from("active_closing")
          .update({
            responsible:
              selectedResponsible
          })
          .eq("id", 1);

        setResponsible(
          selectedResponsible
        );
        setChangingResponsible(false);
setSelectedResponsible("");

        setClosingStarted(true);
        setScreen("closing");
      }}
      style={{
        width: "100%",
        padding: "10px"
      }}
    >
      ✅ Confirmar cambio
    </button>
  </div>
)}
  </div>
)}
<button
  onClick={() => {
  loadLastClosing();
  setScreen("opening");
}}
  style={{
    width: "100%",
    padding: "20px",
    marginBottom: "15px",
    fontSize: "18px",
  }}
>
  🌅 Apertura
</button>

          {/* BOTÓN ADMINISTRAR — FIX: ahora cambia screen a "admin" */}
          <button
            onClick={() => {
              const password = prompt("Contraseña administrador");
              if (password === ADMIN_PASSWORD) {
                setIsAdmin(true);
                setScreen("admin");
              } else {
                alert("Contraseña incorrecta");
              }
            }}
            style={{ padding: "10px" }}
          >
            ⚙️ Administrar
          </button>
        </div>
      )}

      {/* PANTALLA ADMIN */}
      {screen === "admin" && isAdmin && (
        <div style={{ maxWidth: "700px", margin: "auto" }}>
          <h2>⚙️ Panel Administrador</h2>

          <button
            onClick={() => setAdminSection("tasks")}
            style={{ width: "100%", padding: "15px", marginBottom: "10px" }}
          >
            📋 Gestionar tareas
          </button>

          <button
            onClick={() => setAdminSection("employees")}
            style={{ width: "100%", padding: "15px", marginBottom: "10px" }}
          >
            👥 Gestionar empleados
          </button>

          <button
            onClick={() => {
  setAdminSection("history");
loadClosings();
loadForgottenTasks();
}}
            style={{ width: "100%", padding: "15px", marginBottom: "10px" }}
          >
            📊 Historial
          </button>
          
          <button
  onClick={() => {
    setAdminSection("forgotten");
    loadForgottenTasks();
  }}
  style={{
    width: "100%",
    padding: "15px",
    marginBottom: "10px"
  }}
>
  📈 Tareas olvidadas
</button>

          <button
            onClick={() => {
              setScreen("home");
              setIsAdmin(false);
              setAdminSection("");
            }}
            style={{ width: "100%", padding: "15px" }}
          >
            ⬅️ Volver
          </button>

          {/* SECCIÓN TAREAS */}
          {adminSection === "tasks" && (
            <div style={{ marginTop: "20px" }}>
              <h3>📋 Gestionar tareas</h3>

              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título de la tarea"
                style={{ width: "100%", padding: "8px", marginBottom: "8px" }}
              />
              <input
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                placeholder="Instrucciones (opcional)"
                style={{ width: "100%", padding: "8px", marginBottom: "8px" }}
              />
              <button onClick={addTask} style={{ padding: "10px 20px", marginBottom: "20px" }}>
                ➕ Añadir tarea
              </button>

              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    border: "1px solid #ccc",
                    padding: "10px",
                    borderRadius: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <strong>{task.title}</strong>
                  {task.instructions && (
                    <p style={{ margin: "4px 0", color: "#555" }}>
                      {task.instructions}
                    </p>
                  )}
                  <button
  onClick={() => moveTaskUp(task)}
  style={{
    marginRight: "5px",
    padding: "5px 10px",
  }}
>
  ⬆️
</button>

<button
  onClick={() => moveTaskDown(task)}
  style={{
    marginRight: "5px",
    padding: "5px 10px",
  }}
>
  ⬇️
</button>

<button
  onClick={() => editTask(task)}
  style={{
    marginRight: "5px",
    padding: "5px 10px",
  }}
>
  ✏️ Editar
</button>

<button
  onClick={() => deleteTask(task.id)}
  style={{
    background: "#ef4444",
    color: "white",
    border: "none",
    padding: "5px 10px",
    borderRadius: "5px",
  }}
>
  🗑️ Eliminar
</button>
                </div>
              ))}
            </div>
          )}

          {/* SECCIÓN EMPLEADOS — placeholder */}
          {adminSection === "employees" && (
            <div style={{ marginTop: "20px" }}>
              <h3>👥 Gestionar empleados</h3>

<input
  value={newEmployee}
  onChange={(e) =>
    setNewEmployee(e.target.value)
  }
  placeholder="Nombre empleado"
/>

<button onClick={addEmployee}>
  ➕ Añadir empleado
</button>

<h4>Activos</h4>

{employees.map((emp) => (
  <div key={emp.id}>
    {emp.name}

    <button
      onClick={() =>
        deactivateEmployee(emp.id)
      }
    >
      ❌ Desactivar
    </button>
  </div>
))}
  </div>   
)}

          {/* SECCIÓN HISTORIAL — placeholder */}
          {adminSection === "history" && (
  <div style={{ marginTop: "20px" }}>
    <h3>📊 Historial de cierres</h3>

    {closings.map((closing) => (
      <div
        key={closing.id}
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          borderRadius: "8px",
          marginBottom: "10px"
        }}
      >
        <div>
          <strong>
            {new Date(
              closing.created_at
            ).toLocaleDateString()}
          </strong>
        </div>

        <div>
          Responsable: {closing.responsible}
        </div>
        <div>
  Estado:{" "}
  {closing.close_type === "manual" && "🟢 Manual"}
  {closing.close_type === "automatic" && "🟠 Automático"}
  {closing.close_type === "missing" && "🔴 Sin registrar"}
</div>
        <div>
  Pendientes: {closing.pending_tasks}
</div>


        <button
  onClick={() =>
    viewClosing(closing.id)
  }
>
  {selectedClosing === closing.id
    ? "🔽 Ocultar detalle"
    : "👁 Ver detalle"}
</button>

        {selectedClosing === closing.id && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              background: "#f3f4f6",
              borderRadius: "8px"
            }}
          >
            <strong>
              Observaciones:
            </strong>

            <p>
              {closing.notes ||
                "Sin observaciones"}
            </p>

            <strong>
  Incidencias registradas:
</strong>

{closingDetails
  .filter(
    (t) => t.completed && t.incident
  )
  .map((task) => (
    <div
      key={task.id}
      style={{
        marginBottom: "10px"
      }}
    >
      ✅ {task.task_name}

      <div
        style={{
          marginLeft: "20px",
          color: "#b45309"
        }}
      >
        ⚠️ {task.incident}
      </div>
    </div>
  ))}

  {closingDetails.filter(
  (t) => t.completed && t.incident
).length === 0 && (
  <div>
    ✅ Sin incidencias en tareas completadas
  </div>
)}

            <strong>
              Tareas pendientes:
            </strong>

            {closingDetails
              .filter(
                (t) => !t.completed
              )
              .map((task) => (
                <div key={task.id}>
                  ❌ {task.task_name}
                </div>
              ))}

            {closingDetails.filter(
              (t) => !t.completed
            ).length === 0 && (
              <div>
                ✅ Ninguna tarea pendiente
              </div>
            )}
          </div>
        )}
      </div>
    ))}
  </div>
)}
        </div>
      )}

      {adminSection === "forgotten" && (
  <div style={{ marginTop: "20px" }}>
    <h3>
      📈 Tareas más olvidadas
    </h3>

    {Object.entries(forgottenTasks).map(
      ([employee, tasks]) => (
        <div
          key={employee}
          style={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "10px",
            marginBottom: "10px"
          }}
        >
          <button
            onClick={() => {
              setOpenedEmployee(
                openedEmployee === employee
                  ? null
                  : employee
              );
            }}
            style={{
              width: "100%",
              padding: "10px"
            }}
          >
            {openedEmployee === employee
              ? "🔽 "
              : "▶️ "}
            {employee}
          </button>

          {openedEmployee === employee && (
            <div
              style={{
                marginTop: "10px"
              }}
            >
              {Object.entries(tasks)
                .sort(
                  (a, b) =>
                    b[1] - a[1]
                )
                .map(
                  ([task, count]) => (
                    <div
                      key={task}
                      style={{
                        padding:
                          "5px 0"
                      }}
                    >
                      • {task} ({count})
                    </div>
                  )
                )}
            </div>
          )}
        </div>
      )
    )}
  </div>
)}

{screen === "opening" && (
  <div>

    <button
      onClick={() => setScreen("home")}
      style={{
        width: "100%",
        padding: "10px",
        marginBottom: "15px"
      }}
    >
      ⬅️ Volver
    </button>

    <h2>🌅 Apertura</h2>

    <select
      value={openingEmployee}
      onChange={(e) =>
        setOpeningEmployee(e.target.value)
      }
      style={{
        width: "100%",
        padding: "10px",
        marginBottom: "15px"
      }}
    >
      <option value="">
        Seleccionar empleado...
      </option>

      {employees.map((emp) => (
        <option
          key={emp.id}
          value={emp.name}
        >
          {emp.name}
        </option>
      ))}
    </select>

    {lastClosing && (
      <div
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "15px"
        }}
      >
        <strong>
          Último cierre
        </strong>

        <div>
          Responsable:
          {" "}
          {lastClosing.responsible}
        </div>

        <div>
          Estado:
          {" "}
          {lastClosing.close_type}
        </div>
      </div>
    )}

    {openingTasks.map((task) => (
      <div
        key={task.id}
        style={{
          border: "1px solid #ccc",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "10px"
        }}
      >
        <div>
          {task.completed
            ? "✅ "
            : "❌ "}
          {task.task_name}
        </div>

        {task.incident && (
          <div
            style={{
              marginTop: "5px",
              color: "#b45309"
            }}
          >
            ⚠️ {task.incident}
          </div>
        )}

        {task.completed && (
          <button
            onClick={async () => {

              if (!openingEmployee) {
                alert(
                  "Selecciona empleado"
                );
                return;
              }

              const observation =
                prompt(
                  "Describe la incidencia detectada"
                );

              if (!observation)
                return;

              await supabase
                .from(
                  "opening_incidents"
                )
                .insert({
                  closing_id:
                    lastClosing.id,

                  task_name:
                    task.task_name,

                  employee:
                    openingEmployee,

                  observation
                });

              alert(
                "Incidencia guardada"
              );
            }}
            style={{
              marginTop: "10px"
            }}
          >
            ⚠️ Reportar incidencia
          </button>
        )}
      </div>
    ))}

  </div>
)}

      {/* PANTALLA CIERRE — selección de responsable */}
      {screen === "closing" && !closingStarted && (
        <div
          style={{
            border: "2px solid #333",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => {
  setChangingResponsible(false);
  setSelectedResponsible("");
  setScreen("home");
}}
            style={{ marginBottom: "15px", padding: "10px 15px" }}
          >
            ⬅️ Volver
          </button>

          <h2>Responsable del cierre</h2>

          <select
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            style={{ width: "100%", padding: "10px", marginBottom: "15px" }}
          >
            <option value="">Seleccionar responsable...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.name}
              </option>
            ))}
          </select>

          <button
            onClick={async () => {
              if (!responsible) {
                alert("Selecciona un responsable");
                return;
              }
              await supabase
  .from("active_closing")
  .update({ responsible, started: true })
  .eq("id", 1);

setShowExistingClosing(true);
setClosingStarted(true);
            }}
          >
            Iniciar cierre
          </button>
        </div>
      )}

      {/* PANTALLA CIERRE — lista de tareas */}
      {screen === "closing" && closingStarted && (
        <>
          <button
            onClick={() => {
              setClosingStarted(false);
  setChangingResponsible(false);
  setSelectedResponsible("");
  setScreen("home");
}}
            style={{ width: "100%", padding: "10px", marginBottom: "15px" }}
          >
            ⬅️ Volver al menú
          </button>

          <div
  style={{
    background: "#1f2937",
    color: "white",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "15px",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "22px"
  }}
>
  👤 {responsible}
</div>

          {/* FIX: cada tarea tiene su propio div contenedor con key */}
          {[...tasks]
  .sort(
    (a, b) =>
      a.completed - b.completed
  )
  .map((task) => (
            <div
              key={task.id}
              style={{
  background: task.completed
    ? "#dcfce7"
    : "#fee2e2",

  border: task.completed
    ? "2px solid #22c55e"
    : "2px solid #ef4444",

  padding: "15px",
  borderRadius: "8px",
  marginBottom: "15px",
}}
            >
              <h3 style={{ margin: "0 0 8px 0" }}>{task.title}</h3>

              {task.instructions && (
                <p style={{ color: "#555", marginBottom: "8px" }}>
                  {task.instructions}
                </p>
              )}

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "18px",
                }}
              >
                <div style={{ marginTop: "10px" }}>
  <button
    onClick={() => {
      const text = prompt(
        "Incidencia de esta tarea"
      );

      if (!text) return;

      setTaskIncidents((prev) => ({
        ...prev,
        [task.id]: text
      }));
    }}
  >
    ⚠️ Incidencia
  </button>

  {taskIncidents[task.id] && (
    <div
      style={{
        marginTop: "8px",
        color: "#b45309",
        fontWeight: "bold"
      }}
    >
      ⚠️ {taskIncidents[task.id]}
    </div>
  )}
</div>
                <input
  type="checkbox"
  checked={task.completed}
  onChange={() => toggleTask(task)}
  style={{
    width: "28px",
    height: "28px"
  }}
/>
                {task.completed ? "Completada ✅" : "Pendiente"}
              </label>

              {/* Botones de admin solo visibles para administradores */}
              {isAdmin && (
                <div style={{ marginTop: "10px" }}>
                  <button
                    onClick={() => editTask(task)}
                    style={{ marginRight: "8px", padding: "5px 10px" }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    style={{
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "5px",
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Observaciones y botón finalizar */}
          <div style={{ marginTop: "20px" }}>
            <h3>Observaciones del cierre</h3>
            <textarea
              value={notes}
              onChange={async (e) => {
                const value = e.target.value;
                setNotes(value);
                await supabase
                  .from("active_closing")
                  .update({ notes: value })
                  .eq("id", 1);
              }}
              placeholder="Incidencias, faltas de stock, averías..."
              style={{ width: "100%", minHeight: "100px", padding: "10px" }}
            />
            <button
              onClick={finishClosing}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "15px",
                fontSize: "18px",
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "10px",
              }}
            >
              ✅ Finalizar cierre
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;