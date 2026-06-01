import { Icon } from "../Icon";
import { STATE_COLOR } from "../../icons/paths";
import type { Project, TaskItem } from "../../types";

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  tasks: TaskItem[];
  activeTaskId: string | null;
  search: string;
  onSearchChange: (q: string) => void;
  onSelectProject: (id: string) => void;
  onSelectTask: (id: string) => void;
  onNewProject: () => void;
  onNewTask: () => void;
  labels?: {
    projects: string;
    search: string;
    tasks: string;
    noTasks: string;
    newProjectTitle: string;
    newTaskTitle: string;
  };
}

function projectIcon(p: Project) {
  const lower = (p.folderPath ?? "").toLowerCase();
  if (lower.includes(".git") || p.name.includes("git")) return "git-branch";
  return "folder";
}

function folderLabel(path: string) {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts.slice(-2).join("/") || path;
}

export function Sidebar({
  projects,
  activeProjectId,
  tasks,
  activeTaskId,
  search,
  onSearchChange,
  onSelectProject,
  onSelectTask,
  onNewProject,
  onNewTask,
  labels = {
    projects: "Projects",
    search: "Search projects & tasks",
    tasks: "Tasks",
    noTasks: "No tasks yet",
    newProjectTitle: "New project",
    newTaskTitle: "New task",
  },
}: SidebarProps) {
  const q = search.toLowerCase();
  const filteredProjects = projects.filter(
    (p) => p.name.toLowerCase().includes(q) || (p.folderPath ?? "").toLowerCase().includes(q),
  );
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const projectTasks = tasks.filter(
    (t) => t.projectId === activeProjectId && t.name.toLowerCase().includes(q),
  );

  return (
    <div className="sidebar">
      <div className="sb-head">
        <h2>{labels.projects}</h2>
        <button type="button" className="btn icon sm ghost" title={labels.newProjectTitle} onClick={onNewProject}>
          <Icon name="plus" size={18} />
        </button>
      </div>
      <div className="sb-search">
        <Icon name="search" size={15} />
        <input
          placeholder={labels.search}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="sb-scroll">
        {filteredProjects.map((p) => (
          <div
            key={p.id}
            className={`proj${activeProjectId === p.id ? " active" : ""}`}
            onClick={() => onSelectProject(p.id)}
            onKeyDown={(e) => e.key === "Enter" && onSelectProject(p.id)}
            role="button"
            tabIndex={0}
          >
            <div className="pj-ic">
              <Icon name={projectIcon(p)} size={15} />
            </div>
            <div className="pj-meta">
              <div className="pj-name">{p.name}</div>
              <div className="pj-sub">{folderLabel(p.folderPath ?? "")}</div>
            </div>
          </div>
        ))}

        {activeProject && (
          <div className="sb-group">
            <div className="glabel">
              <span>{labels.tasks} · {activeProject.name}</span>
              <button
                type="button"
                className="btn icon sm ghost"
                style={{ width: 22, height: 22 }}
                onClick={onNewTask}
                title={labels.newTaskTitle}
              >
                <Icon name="plus" size={15} />
              </button>
            </div>
            {projectTasks.length === 0 ? (
              <div className="task-row" style={{ cursor: "default", opacity: 0.7 }}>
                <span className="tk-name">{labels.noTasks}</span>
              </div>
            ) : (
              projectTasks.map((t) => (
                <div
                  key={t.id}
                  className={`task-row${activeTaskId === t.id ? " active" : ""}`}
                  onClick={() => onSelectTask(t.id)}
                  onKeyDown={(e) => e.key === "Enter" && onSelectTask(t.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="tk-dot" style={{ background: STATE_COLOR[t.state] }} />
                  <span className="tk-name">{t.name}</span>
                  <span className="tk-time">{t.time}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
