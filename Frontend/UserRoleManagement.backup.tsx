import React, { useState } from 'react';
import { 
  UsersIcon, 
  ShieldCheckIcon, 
  KeyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  useGetUsersQuery,
  useGetRolesQuery,
  useGetPermissionsQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignUserRolesMutation,
  type User,
  type Role,
  type Permission
} from '../../services/userManagementApi';

const UserRoleManagement: React.FC = () => {
  // API hooks
  const { data: usersData, isLoading: usersLoading, error: usersError } = useGetUsersQuery();
  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useGetRolesQuery();
  const { data: permissionsData, isLoading: permissionsLoading, error: permissionsError } = useGetPermissionsQuery();
  
  // Mutations
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const [assignUserRoles] = useAssignUserRolesMutation();
  
  // Local state
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{type: 'user' | 'role', id: number, name: string} | null>(null);

  // Note: Form states removed - using new modal components

  // Derived data
  const users = usersData?.users || [];
  const roles = rolesData?.roles || [];
  const permissions = permissionsData?.permissions || [];
  const loading = usersLoading || rolesLoading || permissionsLoading;
  
  // Filter functions
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active);
    return matchesSearch && matchesStatus;
  });
  
  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && role.is_active) ||
                         (filterStatus === 'inactive' && !role.is_active);
    return matchesSearch && matchesStatus;
  });

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
  
  // Handle functions
  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserModal(true);
  };
  
  const handleViewUser = (user: User) => {
    setViewingUser(user);
  };
  
  const handleDeleteUser = (user: User) => {
    setShowDeleteConfirm({ type: 'user', id: user.id, name: user.full_name });
  };
  
  const handleCreateRole = () => {
    setEditingRole(null);
    setShowRoleModal(true);
  };
  
  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setShowRoleModal(true);
  };
  
  const handleDeleteRole = (role: Role) => {
    setShowDeleteConfirm({ type: 'role', id: role.id, name: role.name });
  };
  
  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      if (showDeleteConfirm.type === 'user') {
        await deleteUser(showDeleteConfirm.id).unwrap();
      } else {
        await deleteRole(showDeleteConfirm.id).unwrap();
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Note: saveRole and saveUser functions removed - using new modal components with RTK Query

  // Delete Role Handler
  const deleteRoleHandler = async (roleId: number) => {
    if (!confirm('Are you sure you want to delete this role?')) {
      return;
    }

    try {
      await deleteRole(roleId).unwrap();
      alert('Role deleted successfully!');
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role');
    }
  };

  // Delete User Handler
  const deleteUserHandler = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteUser(userId).unwrap();
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  // Open edit modals
  const editRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p.id)
    });
    setShowRoleModal(true);
  };

  const editUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      password: '',
      roles: user.roles.map(r => r.id),
      is_active: user.is_active
    });
    setShowUserModal(true);
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading user roles...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          User Role Management
        </h1>
        <p className="text-gray-600">
          Manage user roles, permissions, and access control
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'roles', label: 'Roles', icon: ShieldCheckIcon, count: roles.length },
              { id: 'users', label: 'Users', icon: UsersIcon, count: users.length },
              { id: 'permissions', label: 'Permissions', icon: KeyIcon, count: permissions.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Roles</h2>
            <button
              onClick={() => setShowRoleModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Role
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div key={role.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <ShieldCheckIcon className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      <p className="text-sm text-gray-500">{role.description}</p>
                    </div>
                  </div>
                  {role.is_system && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      System
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Users:</span>
                      <span className="font-medium">{role.user_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Permissions:</span>
                      <span className="font-medium">{role.permissions.length}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => editRole(role)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  {!role.is_system && (
                    <button
                      onClick={() => deleteRoleHandler(role.id)}
                      className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Users</h2>
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create User
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UsersIcon className="h-8 w-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? user.roles.map((role, index) => (
                          <span
                            key={`user-${user.id}-role-${role.id || role.name || index}`}
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                          >
                            {role.name || 'Unknown Role'}
                          </span>
                        )) : (
                          <span className="text-sm text-gray-500">No roles assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => editUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteUserHandler(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Permissions</h2>
          
          <div className="space-y-6">
            {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
              <div key={module} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                  {module} Module
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modulePermissions.map((permission) => (
                    <div key={permission.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="font-medium text-gray-900">{permission.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{permission.description}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        Action: {permission.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role Name</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({...roleForm, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                      <div key={module} className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2 capitalize">{module}</h4>
                        <div className="space-y-2">
                          {modulePermissions.map((permission) => (
                            <label key={`role-${permission.id}`} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={roleForm.permissions.includes(permission.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRoleForm({
                                      ...roleForm,
                                      permissions: [...roleForm.permissions, permission.id]
                                    });
                                  } else {
                                    setRoleForm({
                                      ...roleForm,
                                      permissions: roleForm.permissions.filter(p => p !== permission.id)
                                    });
                                  }
                                }}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">{permission.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setEditingRole(null);
                    setRoleForm({ name: '', description: '', permissions: [] });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <label key={`user-role-${role.id}`} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={userForm.roles.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserForm({
                                ...userForm,
                                roles: [...userForm.roles, role.id]
                              });
                            } else {
                              setUserForm({
                                ...userForm,
                                roles: userForm.roles.filter(r => r !== role.id)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userForm.is_active}
                      onChange={(e) => setUserForm({...userForm, is_active: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Active User</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    setUserForm({ username: '', full_name: '', email: '', password: '', roles: [], is_active: true });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoleManagement;
