# Plane CLI Command Coverage Matrix

This matrix is the command-to-SDK contract for the Plane CLI. “Initial” is the minimum useful first-class surface. “Extended” remains accessible through `plane api` until implemented as a named command.

## Global commands

| Surface | Commands | Backing operation | Delivery |
| --- | --- | --- | --- |
| Health | `doctor` | SDK `users.me`, selected-context lookups | Initial |
| Context | `context show`, `list`, `set`, `use`, `delete` | Local configuration | Initial |
| Configuration | `config path` | Local configuration | Initial |
| Raw API | `api <method> <path>` | Authenticated native `fetch` | Initial |
| Skill | `skill path`, `skill install` | Packaged skill files | Initial |
| TUI | `tui` | Shared operations | Initial |

## Initial command surface

### User, workspace, and projects

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| User | `user me` | `users.me` |
| Member | `member list [--project <project>]` | `workspace.getMembers`, `projects.getMembers` |
| Project | `project list`, `get`, `create`, `update`, `delete`, `archive`, `unarchive` | `projects.list`, `retrieve`, `create`, `update`, `delete`, `archive`, `unArchive` |
| Project features | `project-feature get`, `update` | `projects.retrieveFeatures`, `updateFeatures` |

### Work items and supporting resources

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| Work item | `work-item list`, `search`, `get`, `create`, `update`, `delete`, `archive`, `unarchive` | `workItems.list`, `listWorkspace`, `search`, `advancedSearch`, `retrieve`, `retrieveByIdentifier`, `create`, `update`, `delete`, `archive`, `unarchive` |
| State | `state list`, `get`, `create`, `update`, `delete` | `states.list`, `retrieve`, `create`, `update`, `delete` |
| Label | `label list`, `get`, `create`, `update`, `delete` | `labels.list`, `retrieve`, `create`, `update`, `delete` |
| Comment | `comment list <work-item>`, `get`, `create`, `update`, `delete` | `workItems.comments.list`, `retrieve`, `create`, `update`, `delete` |
| Relation | `relation list <work-item>`, `add`, `remove` | `workItems.relations.list`, `create`, `delete` |

### Scheduling and grouping

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| Cycle | `cycle list`, `get`, `create`, `update`, `delete`, `archive`, `unarchive`, `list-items`, `add-items`, `remove-item`, `transfer-items` | `cycles.list`, `retrieve`, `create`, `update`, `delete`, `archive`, `unArchive`, `listWorkItemsInCycle`, `addWorkItemsToCycle`, `removeWorkItemFromCycle`, `transferWorkItemsToAnotherCycle` |
| Module | `module list`, `get`, `create`, `update`, `delete`, `archive`, `unarchive`, `list-items`, `add-items`, `remove-item` | `modules.list`, `retrieve`, `create`, `update`, `delete`, `archiveModule`, `unArchiveModule`, `listWorkItemsInModule`, `addWorkItemsToModule`, `removeWorkItemFromModule` |

## Extended first-class surface

### Work-item detail

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| Activity | `activity list`, `get` | `workItems.activities.list`, `retrieve` |
| Attachment | `attachment list`, `get`, `upload`, `update`, `delete` | `workItems.attachments.list`, `retrieve`, `create`, `update`, `delete` |
| Link | `link list`, `get`, `create`, `update`, `delete` | `links.list`, `retrieve`, `create`, `update`, `delete` |
| Dependency | `dependency list`, `add`, `remove` | `workItems.dependencies.list`, `create`, `remove` |
| Custom relation | `custom-relation list`, `add`, `remove` | `workItems.customRelations.list`, `create`, `remove` |
| Work log | `work-log list`, `create`, `update`, `delete` | `workItems.workLogs.list`, `create`, `update`, `delete` |
| Work-item page | `work-item-page list`, `get`, `create`, `delete` | `workItems.pages.list`, `retrieve`, `create`, `delete` |

### Planning and portfolio

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| Epic | `epic list`, `get`, `create`, `update`, `delete`, `list-items`, `add-items` | `epics.list`, `retrieve`, `create`, `update`, `delete`, `listIssues`, `addIssues` |
| Initiative | `initiative list`, `get`, `create`, `update`, `delete` | `initiatives.list`, `retrieve`, `create`, `update`, `delete` |
| Initiative epic | `initiative-epic list`, `add`, `remove` | `initiatives.epics.list`, `add`, `remove` |
| Initiative project | `initiative-project list`, `add`, `remove` | `initiatives.projects.list`, `add`, `remove` |
| Initiative label | `initiative-label list`, `get`, `create`, `update`, `delete`, `add`, `remove` | `initiatives.labels.list`, `retrieve`, `create`, `update`, `delete`, `addLabels`, `removeLabels` |
| Milestone | `milestone list`, `get`, `create`, `update`, `delete`, `list-items`, `add-items`, `remove-items` | `milestones.list`, `retrieve`, `create`, `update`, `delete`, `listWorkItems`, `addWorkItems`, `removeWorkItems` |
| Intake | `intake list`, `get`, `create`, `update`, `delete`, `set-status` | `intake.list`, `retrieve`, `create`, `update`, `delete`, `updateStatus` |

### Workspace organization

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| Workspace features | `workspace-feature get`, `update` | `workspace.retrieveFeatures`, `updateFeatures` |
| Role | `role list`, `get` | `roles.list`, `retrieve` |
| Teamspace | `teamspace list`, `get`, `create`, `update`, `delete` | `teamspaces.list`, `retrieve`, `create`, `update`, `delete` |
| Teamspace member | `teamspace-member list`, `add`, `remove` | `teamspaces.members.list`, `add`, `remove` |
| Teamspace project | `teamspace-project list`, `add`, `remove` | `teamspaces.projects.list`, `add`, `remove` |
| Sticky | `sticky list`, `get`, `create`, `update`, `delete` | `stickies.list`, `retrieve`, `create`, `update`, `delete` |

### Customers

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| Customer | `customer list`, `get`, `create`, `update`, `delete`, `delete-external`, `list-items`, `link-items`, `unlink-item` | `customers.list`, `retrieve`, `create`, `update`, `delete`, `deleteByExternalId`, `listCustomerIssues`, `linkIssuesToCustomer`, `unlinkIssueFromCustomer` |
| Customer request | `customer-request list`, `get`, `create`, `update`, `delete` | `customers.requests.list`, `retrieve`, `create`, `update`, `delete` |
| Customer property | `customer-property list`, `get`, `create`, `update`, `delete`, `list-values`, `get-value`, `create-values`, `update-value` | `customers.properties.*` |

### Types, properties, and estimates

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| Estimate | `estimate get`, `create`, `update`, `delete`, `link-project`, `list-points`, `create-points`, `update-point`, `delete-point` | `estimates.*` |
| Work-item type | `work-item-type list`, `get`, `create`, `update`, `delete`, `import-project` | `workItemTypes.*` |
| Work-item property | `work-item-property list`, `get`, `create`, `update`, `delete`, `attach-type`, `detach-type` | `workItemProperties.*` |
| Property option | `property-option list`, `get`, `create`, `update`, `delete` | `workItemProperties.options.*` |
| Property value | `property-value list`, `get`, `create`, `update`, `delete` | `workItemProperties.values.*` |
| Relation definition | `relation-definition list`, `create`, `update`, `delete` | `workItemRelationDefinitions.*` |
| Workspace work-item type | `workspace-work-item-type list`, `get`, `create`, `update`, `delete` | `workspaceWorkItemTypes.*` |
| Workspace property | `workspace-property list`, `get`, `create`, `update`, `delete` | `workspaceWorkItemProperties.*` |
| Workspace property option | `workspace-property-option list`, `get`, `create`, `update`, `delete` | `workspaceWorkItemProperties.options.*` |
| Workspace project label | `workspace-project-label list`, `create`, `update`, `delete` | `workspaceProjectLabels.*` |
| Workspace project state | `workspace-project-state list`, `create`, `update`, `delete` | `workspaceProjectStates.*` |

### Pages, collections, and templates

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| Page | `page list`, `get`, `create` with workspace/project scope | `pages.listWorkspacePages`, `listProjectPages`, `retrieveWorkspacePage`, `retrieveProjectPage`, `createWorkspacePage`, `createProjectPage` |
| Collection | `collection list`, `get`, `create`, `update`, `delete` | `collections.*` |
| Collection member | `collection-member list`, `add`, `update`, `remove` | `collections.members.*` |
| Collection page | `collection-page list`, `search`, `add`, `update`, `remove` | `collections.pages.*` |
| Workspace template | `workspace-template list`, `create`, `update`, `delete` with work-item/project/page type | `workspaceTemplates.*` |
| Project template | `project-template list`, `create`, `update`, `delete` with work-item/page type | `projectTemplates.*` |

### Releases and workflows

| Resource | Commands | SDK mapping |
| --- | --- | --- |
| Release | `release list`, `get`, `create`, `update`, `delete` | `releases.*` |
| Release changelog | `release-changelog get`, `update` | `releases.changelog.*` |
| Release comment | `release-comment list`, `get`, `create`, `update`, `delete` | `releases.comments.*` |
| Release label | `release-label list`, `get`, `create`, `update`, `delete` | `releases.labels.*` |
| Release item label | `release-item-label list`, `add`, `remove` | `releases.itemLabels.*` |
| Release link | `release-link list`, `get`, `create`, `update`, `delete` | `releases.links.*` |
| Release tag | `release-tag list`, `get`, `create`, `update`, `delete` | `releases.tags.*` |
| Release work item | `release-work-item list`, `add`, `remove` | `releases.workItems.*` |
| Workflow | `workflow list`, `create`, `update` | `workflows.*` |
| Workflow state | `workflow-state attach`, `detach` | `workflows.states.*` |
| Workflow transition | `workflow-transition list`, `create`, `update`, `delete` | `workflows.transitions.*` |

## Raw-API-only surface

| Resource | Reason |
| --- | --- |
| Agent runs and agent-run activities | Not a normal project-management operation for the initial CLI audience. |
| User asset upload outside attachment flows | No demonstrated direct user workflow. |
| Instance administration, billing, SSO, and IDP synchronization | Explicitly outside product scope. |
| Any documented public endpoint absent from the pinned SDK | Available through `plane api` until a stable first-class contract is defined. |

## Coverage rules

- A first-class command is complete only when human help, JSON help, success output, normalized failures, pagination where applicable, and destructive-action behavior are contract-tested.
- The SDK version is pinned. A dependency update must compare exported SDK resources and methods against this matrix.
- Method renames in the SDK do not rename CLI commands unless the CLI contract itself is intentionally changed.
- Plane's historical `issue` names inside SDK method names do not appear in commands or public output.
