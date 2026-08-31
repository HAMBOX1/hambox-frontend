import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ROLES_API } from '../../../../core/api/api-endpoints';
import { provideApiTestBed } from '../../../../testing/common-test.providers';
import { RoleManagementFacade } from './role-management.facade';

const ROLE_ID = 'role-1';
const EXISTING_PERMISSION_ID = 'perm-existing';
const NEWLY_TICKED_PERMISSION_ID = 'perm-dashboard-view';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function roleDetail(permissionIds: readonly string[]) {
  return {
    id: ROLE_ID,
    name: 'Admin2',
    description: null,
    isSystem: false,
    isDefault: false,
    priorityLevel: 100,
    permissionIds,
  };
}

const ROLE_UPDATE_REQUEST = {
  name: 'Admin2',
  description: null,
  priorityLevel: 100,
  isDefault: false,
};

/**
 * Regression cover for the "role permission edits silently do nothing" bug: saveRole() calls
 * updateRole() and then savePermissions(). updateRole() used to reload the role detail, and
 * loadRoleDetail() resets selectedPermissionIds to whatever the server currently stores — so the
 * admin's freshly-ticked checkboxes were discarded before savePermissions() sent its payload.
 * Every save returned 204 while persisting the unchanged, pre-existing permission set.
 */
describe('RoleManagementFacade — permission edits survive a role-detail update', () => {
  let facade: RoleManagementFacade;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      // The facade is @Injectable() without providedIn — it's provided by the admin roles
      // route, so the test has to supply it the same way.
      providers: [provideApiTestBed(), provideHttpClientTesting(), RoleManagementFacade],
    }).compileComponents();

    facade = TestBed.inject(RoleManagementFacade);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Puts the facade in the state the edit page is in after loading a role. */
  async function loadRoleWithOneExistingPermission(): Promise<void> {
    const loaded = facade.loadRoleDetail(ROLE_ID);
    httpMock.expectOne(ROLES_API.role(ROLE_ID)).flush(roleDetail([EXISTING_PERMISSION_ID]));
    await loaded;
  }

  /** Runs saveRole()'s exact order — role details first, permissions second — and returns the
   * permissionIds the facade actually put on the wire. */
  async function updateThenSavePermissions(finalPermissionIds: readonly string[]): Promise<string[]> {
    const updating = facade.updateRole(ROLE_ID, ROLE_UPDATE_REQUEST);
    httpMock.expectOne((r) => r.url === ROLES_API.role(ROLE_ID) && r.method === 'PUT').flush(null);
    await updating;

    const saving = facade.savePermissions(ROLE_ID);
    const permissionsRequest = httpMock.expectOne(ROLES_API.permissions(ROLE_ID));
    const sent = permissionsRequest.request.body.permissionIds as string[];

    permissionsRequest.flush(null);
    await flushMicrotasks();

    // savePermissions() reloads the detail once the new set is persisted.
    httpMock.expectOne(ROLES_API.role(ROLE_ID)).flush(roleDetail(finalPermissionIds));
    expect(await saving).toBe(true);

    return sent;
  }

  it('sends the newly ticked permission after updateRole runs first', async () => {
    await loadRoleWithOneExistingPermission();

    // The admin ticks an extra permission (e.g. Dashboard.View) in the matrix.
    facade.togglePermission(NEWLY_TICKED_PERMISSION_ID, true);
    expect(facade.selectedPermissionIds()).toContain(NEWLY_TICKED_PERMISSION_ID);

    const sent = await updateThenSavePermissions([EXISTING_PERMISSION_ID, NEWLY_TICKED_PERMISSION_ID]);

    // The real assertion: the payload carries the ticked permission, not just the stored one.
    expect(sent).toContain(NEWLY_TICKED_PERMISSION_ID);
    expect(sent).toContain(EXISTING_PERMISSION_ID);
  });

  it('sends an unticked permission removal too', async () => {
    await loadRoleWithOneExistingPermission();

    facade.togglePermission(EXISTING_PERMISSION_ID, false);

    const sent = await updateThenSavePermissions([]);

    expect(sent).toEqual([]);
  });
});
