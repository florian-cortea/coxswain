// One transparent label for Guide and Pierre rows: native single-line ellipsis,
// without painted truncation masks that can cover an inset row highlight.
export function SidebarFileLabel(props: {
  path: string;
  name?: string;
  showFolder?: boolean;
  directory?: boolean;
  deleted?: boolean;
  color?: string;
}) {
  const slash = props.path.lastIndexOf("/");
  const parent = slash >= 0 ? props.path.slice(0, slash) : "";
  const folder = parent.length > 26 ? `${parent.slice(0, 7)}…${parent.slice(-18)}` : parent;
  return (
    <span
      className="sidebar-file-label"
      data-directory={props.directory}
      data-deleted={props.deleted}
      style={{ color: props.color }}
    >
      <span className="sidebar-file-label-name" title={props.path}>
        {props.name ?? props.path.slice(slash + 1)}
      </span>
      {props.showFolder && parent && (
        <span className="sidebar-file-label-folder" title={parent}>
          {folder}
        </span>
      )}
    </span>
  );
}
