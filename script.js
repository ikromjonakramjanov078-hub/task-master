"use strict";

// ==========================================
// TASK MASTER
// Muallif: AKRAMJONOVA JADRA MARATOVNA
// ==========================================

const STORAGE_KEY = "task_master_jadra_v1";

const $ = (selector) => document.querySelector(selector);

const elements = {
  modal: $("#taskModal"),
  form: $("#taskForm"),
  taskId: $("#taskId"),
  title: $("#taskTitle"),
  description: $("#taskDescription"),
  category: $("#taskCategory"),
  priority: $("#taskPriority"),
  deadline: $("#taskDeadline"),
  status: $("#taskStatus"),
  search: $("#searchInput"),
  categoryFilter: $("#categoryFilter"),
  sortFilter: $("#sortFilter"),
  toast: $("#toast")
};

const statusNames = {
  new: "Yangi",
  doing: "Jarayonda",
  done: "Bajarildi"
};

const priorityNames = {
  high: "Yuqori",
  medium: "O‘rta",
  low: "Past"
};

const statusOrder = ["new", "doing", "done"];
const priorityOrder = { high: 3, medium: 2, low: 1 };

let tasks = loadTasks();
let currentView = "all";
let toastTimer;

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(task =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        statusOrder.includes(task.status) &&
        Object.hasOwn(priorityNames, task.priority) &&
        ["Ish", "O‘qish", "Shaxsiy", "Loyiha"].includes(task.category)
      )
      .map(task => ({
        id: task.id,
        title: task.title.slice(0, 100),
        description: String(task.description || "").slice(0, 500),
        category: task.category,
        priority: task.priority,
        deadline: /^\d{4}-\d{2}-\d{2}$/.test(task.deadline || "")
          ? task.deadline : "",
        status: task.status,
        createdAt: Number.isFinite(task.createdAt)
          ? task.createdAt : Date.now(),
        updatedAt: Number.isFinite(task.updatedAt)
          ? task.updatedAt : Date.now()
      }));
  } catch (error) {
    console.error("Saqlangan vazifalarni o‘qib bo‘lmadi:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Vazifalarni saqlab bo‘lmadi:", error);
    showToast("Saqlash amalga oshmadi. Brauzer xotirasini tekshiring.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "Muddat belgilanmagan";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function isOverdue(task) {
  return Boolean(
    task.deadline &&
    task.deadline < localDateString() &&
    task.status !== "done"
  );
}

function showToast(message) {
  clearTimeout(toastTimer);

  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2600);
}

// ==========================================
// VAZIFALARNI SARALASH VA FILTRLASH
// ==========================================

function getVisibleTasks() {
  const query = elements.search.value.trim().toLocaleLowerCase("uz");
  const category = elements.categoryFilter.value;

  let result = tasks.filter(task => {
    const matchesSearch = (
      task.title + " " + task.description
    ).toLocaleLowerCase("uz").includes(query);

    const matchesCategory =
      category === "all" || task.category === category;

    let matchesView = true;

    if (currentView === "today") {
      matchesView = task.deadline === localDateString();
    } else if (currentView === "important") {
      matchesView = task.priority === "high" && task.status !== "done";
    } else if (currentView === "completed") {
      matchesView = task.status === "done";
    }

    return matchesSearch && matchesCategory && matchesView;
  });

  const sort = elements.sortFilter.value;

  if (sort === "deadline") {
    result.sort((a, b) => {
      if (!a.deadline && !b.deadline) return b.createdAt - a.createdAt;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  } else if (sort === "priority") {
    result.sort((a, b) =>
      priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  } else {
    result.sort((a, b) => b.createdAt - a.createdAt);
  }

  return result;
}

// ==========================================
// STATISTIKA
// ==========================================

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "done").length;
  const doing = tasks.filter(t => t.status === "doing").length;
  const overdue = tasks.filter(isOverdue).length;
  const percent = total ? Math.round(completed / total * 100) : 0;

  $("#totalStat").textContent = total;
  $("#progressStat").textContent = doing;
  $("#completedStat").textContent = completed;
  $("#overdueStat").textContent = overdue;

  $("#allCount").textContent = total;
  $("#progressPercent").textContent = `${percent}%`;
  $("#progressFill").style.width = `${percent}%`;

  $("#progressText").textContent = total
    ? `${total} ta vazifadan ${completed} tasi bajarildi.`
    : "Birinchi vazifangni yarat va maqsading sari harakatni boshla!";

  $("#todayDate").textContent = new Intl.DateTimeFormat("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date()).toLocaleUpperCase("uz");

  $("#newCount").textContent =
    tasks.filter(t => t.status === "new").length;
  $("#doingCount").textContent = doing;
  $("#doneCount").textContent = completed;
}

// ==========================================
// VAZIFA KARTOCHKASINI YARATISH
// ==========================================

function taskCard(task) {
  const overdue = isOverdue(task);

  const deadlineClass = overdue
    ? "overdue"
    : task.deadline ? "" : "no-date";

  const deadlineLabel = overdue
    ? "⚠ Muddati o‘tgan: "
    : task.status === "done" ? "✓ Muddat: " : "◷ Muddat: ";

  let nextStatus;

  if (task.status === "new") {
    nextStatus = "doing";
  } else if (task.status === "doing") {
    nextStatus = "done";
  } else {
    nextStatus = "new";
  }

  const nextLabel = {
    new: "Boshlash →",
    doing: "Tugatish ✓",
    done: "↺ Qaytarish"
  }[task.status];

  return `
    <article class="task-card ${overdue ? "is-overdue" : ""}">
      <div class="task-card-top">
        <span class="category-tag">${escapeHTML(task.category)}</span>
        <span class="priority-tag ${task.priority}">
          ${priorityNames[task.priority]}
        </span>
      </div>

      <h4 class="task-title">${escapeHTML(task.title)}</h4>

      ${task.description
        ? `<p class="task-description">${escapeHTML(task.description)}</p>`
        : ""}

      <div class="task-deadline ${deadlineClass}">
        <span>${deadlineLabel}</span>
        <span>${escapeHTML(formatDate(task.deadline))}</span>
      </div>

      <div class="task-actions">
        <button class="small-btn" data-action="status"
          data-id="${escapeHTML(task.id)}"
          aria-label="${nextLabel}">
          ${nextLabel}
        </button>

        <button class="small-btn" data-action="edit"
          data-id="${escapeHTML(task.id)}">
          ✎ Tahrirlash
        </button>

        <button class="small-btn delete" data-action="delete"
          data-id="${escapeHTML(task.id)}">
          × O‘chirish
        </button>
      </div>
    </article>
  `;
}

// ==========================================
// DOSKANI YANGILASH
// ==========================================

function renderTasks() {
  updateStats();

  const visible = getVisibleTasks();
  const groups = {
    new: visible.filter(t => t.status === "new"),
    doing: visible.filter(t => t.status === "doing"),
    done: visible.filter(t => t.status === "done")
  };

  const listMap = {
    new: $("#newList"),
    doing: $("#doingList"),
    done: $("#doneList")
  };

  Object.keys(groups).forEach(status => {
    const list = listMap[status];

    if (groups[status].length) {
      list.innerHTML = groups[status].map(taskCard).join("");
    } else {
      list.innerHTML = `
        <div class="empty-state">
          <div style="font-size:24px;margin-bottom:8px">◇</div>
          Bu bo‘limda hozircha vazifa yo‘q.
        </div>
      `;
    }
  });

  $("#visibleCount").textContent = `${visible.length} ta vazifa`;
}

// ==========================================
// MODAL OYNASI
// ==========================================

function openModal(task = null) {
  elements.form.reset();
  elements.taskId.value = "";

  if (task) {
    $("#modalTitle").textContent = "Vazifani tahrirlash";
    $("#saveTask").textContent = "O‘zgarishlarni saqlash";

    elements.taskId.value = task.id;
    elements.title.value = task.title;
    elements.description.value = task.description;
    elements.category.value = task.category;
    elements.priority.value = task.priority;
    elements.deadline.value = task.deadline;
    elements.status.value = task.status;
  } else {
    $("#modalTitle").textContent = "Yangi vazifa yaratish";
    $("#saveTask").textContent = "Vazifani saqlash";
    elements.priority.value = "medium";
    elements.status.value = "new";
  }

  elements.modal.hidden = false;
  document.body.style.overflow = "hidden";

  setTimeout(() => elements.title.focus(), 50);
}

function closeModal() {
  elements.modal.hidden = true;
  document.body.style.overflow = "";
  $("#openAdd").focus();
}

$("#openAdd").addEventListener("click", () => openModal());
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);

elements.modal.addEventListener("click", event => {
  if (event.target === elements.modal) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !elements.modal.hidden) {
    closeModal();
  }
});

// ==========================================
// YANGI VAZIFA YARATISH VA TAHRIRLASH
// ==========================================

elements.form.addEventListener("submit", event => {
  event.preventDefault();

  const title = elements.title.value.trim();

  if (!title) {
    showToast("Vazifa nomini kiriting!");
    elements.title.focus();
    return;
  }

  const id = elements.taskId.value;
  const existing = tasks.find(task => task.id === id);
  const now = Date.now();

  const taskData = {
    id: existing ? existing.id : createId(),
    title,
    description: elements.description.value.trim(),
    category: elements.category.value,
    priority: elements.priority.value,
    deadline: elements.deadline.value,
    status: elements.status.value,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };

  if (existing) {
    tasks = tasks.map(task => task.id === id ? taskData : task);
  } else {
    tasks.unshift(taskData);
  }

  if (!saveTasks()) {
    tasks = existing
      ? tasks.map(task => task.id === id ? existing : task)
      : tasks.filter(task => task.id !== taskData.id);

    renderTasks();
    return;
  }

  closeModal();
  renderTasks();

  showToast(existing
    ? "Vazifa muvaffaqiyatli yangilandi!"
    : "Yangi vazifa qo‘shildi!");
});

// ==========================================
// KARTOCHKALAR AMALLARI
// ==========================================

document.querySelector(".board").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const { action, id } = button.dataset;
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  if (action === "edit") {
    openModal(task);
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm(
      `"${task.title}" vazifasini o‘chirishni xohlaysizmi?`
    );

    if (!confirmed) return;

    const oldTasks = tasks;
    tasks = tasks.filter(item => item.id !== id);

    if (!saveTasks()) {
      tasks = oldTasks;
      renderTasks();
      return;
    }

    renderTasks();
    showToast("Vazifa o‘chirildi.");
    return;
  }

  if (action === "status") {
    const oldStatus = task.status;
    const oldUpdatedAt = task.updatedAt;

    task.status = task.status === "new"
      ? "doing"
      : task.status === "doing"
        ? "done"
        : "new";

    task.updatedAt = Date.now();

    if (!saveTasks()) {
      task.status = oldStatus;
      task.updatedAt = oldUpdatedAt;
      renderTasks();
      return;
    }

    renderTasks();
    showToast(`Vazifa holati: ${statusNames[task.status]}`);
  }
});

// ==========================================
// MENYU VA QIDIRUV
// ==========================================

const viewTitles = {
  all: "Barcha vazifalar",
  today: "Bugungi vazifalar",
  important: "Muhim vazifalar",
  completed: "Bajarilgan vazifalar"
};

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    $("#pageTitle").textContent = viewTitles[currentView];
    renderTasks();
  });
});

elements.search.addEventListener("input", renderTasks);
elements.categoryFilter.addEventListener("change", renderTasks);
elements.sortFilter.addEventListener("change", renderTasks);

// ==========================================
// ISHGA TUSHIRISH
// ==========================================

renderTasks();

console.log(
  "TASK MASTER ishga tushdi | Muallif: AKRAMJONOVA JADRA MARATOVNA"
);