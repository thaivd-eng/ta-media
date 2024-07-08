<template>
  <div class="navbar bg-base-100">
    <slot name="nav-leading"></slot>

    <slot name="nav-action"></slot>
    
    <div class="ml-3 dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
        <div class="w-10 rounded-full">
          <img
            alt="Tailwind CSS Navbar component"
            src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg" />
        </div>
      </div>
      <ul
        tabindex="0"
        class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
        <li><a>Thông tin</a></li>
        <li><a>Cấu hình</a></li>
        <li><a>Đăng xuất</a></li>
      </ul>
    </div>
  </div>
</template>