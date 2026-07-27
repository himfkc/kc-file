/**
 * auth-modal.js - 登录/注册弹框 Vue 组件
 * 依赖：Vue 3 CDN（vue.global.prod.js）
 * 使用方式：<auth-modal></auth-modal>
 */
(function () {
  if (typeof Vue === 'undefined') return;

  // ==================== 组件定义 ====================
  const AuthModal = {
    template: /*html*/`
    <div class="modal fade" ref="bsModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">{{ activeTab === 'login' ? '登录' : '注册' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
          </div>
          <div class="modal-body">
            <!-- 标签切换 -->
            <div class="auth-tabs">
              <div class="auth-tab" :class="{ active: activeTab === 'login' }" @click="switchTab('login')">登录</div>
              <div class="auth-tab" :class="{ active: activeTab === 'register' }" @click="switchTab('register')">注册</div>
            </div>

            <!-- 登录表单 -->
            <form v-show="activeTab === 'login'" @submit.prevent="handleLogin">
              <div class="mb-3">
                <label for="loginUser" class="form-label">用户名</label>
                <input type="text" class="form-control" id="loginUser" v-model="loginForm.username" placeholder="请输入用户名" required>
              </div>
              <div class="mb-3">
                <label for="loginPass" class="form-label">密码</label>
                <input type="password" class="form-control" id="loginPass" v-model="loginForm.password" placeholder="请输入密码" required>
              </div>
              <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="rememberMe" v-model="loginForm.remember">
                <label class="form-check-label" for="rememberMe">记住登录</label>
              </div>
              <button type="submit" class="btn btn-primary w-100">登录</button>
            </form>

            <!-- 注册表单 -->
            <form v-show="activeTab === 'register'" @submit.prevent="handleRegister">
              <div class="mb-3">
                <label for="regUser" class="form-label">用户名</label>
                <input type="text" class="form-control" id="regUser" v-model="registerForm.username" placeholder="请输入用户名" required>
              </div>
              <div class="mb-3">
                <label for="regEmail" class="form-label">邮箱</label>
                <input type="email" class="form-control" id="regEmail" v-model="registerForm.email" placeholder="请输入邮箱" required>
              </div>
              <div class="mb-3">
                <label for="regPass" class="form-label">密码</label>
                <input type="password" class="form-control" id="regPass" v-model="registerForm.password" placeholder="请输入密码" required>
              </div>
              <div class="mb-3">
                <label for="regPass2" class="form-label">确认密码</label>
                <input type="password" class="form-control" id="regPass2" v-model="registerForm.password2" placeholder="请再次输入密码" required>
              </div>
              <button type="submit" class="btn btn-primary w-100">注册</button>
            </form>
          </div>
        </div>
      </div>
    </div>`,

    data() {
      return {
        activeTab: 'login',
        bsInstance: null,
        loginForm: { username: '', password: '', remember: false },
        registerForm: { username: '', email: '', password: '', password2: '' }
      };
    },

    mounted() {
      this.bsInstance = new bootstrap.Modal(this.$refs.bsModal);

      // 监听弹框关闭，重置到登录面板
      this.$refs.bsModal.addEventListener('hidden.bs.modal', () => {
        this.activeTab = 'login';
        this.loginForm = { username: '', password: '', remember: false };
        this.registerForm = { username: '', email: '', password: '', password2: '' };
      });
    },

    beforeUnmount() {
      if (this.bsInstance) {
        this.bsInstance.dispose();
        this.bsInstance = null;
      }
    },

    methods: {
      /** 打开弹框并切到指定面板 */
      open(tab) {
        this.activeTab = tab === 'register' ? 'register' : 'login';
        if (this.bsInstance) {
          this.bsInstance.show();
        }
      },

      /** 标签切换 */
      switchTab(tab) {
        this.activeTab = tab;
      },

      /** 登录提交 */
      handleLogin() {
        // TODO: 对接后端登录接口
        console.log('登录:', this.loginForm);
        alert('登录功能开发中...');
      },

      /** 注册提交 */
      handleRegister() {
        if (this.registerForm.password !== this.registerForm.password2) {
          alert('两次密码不一致');
          return;
        }
        // TODO: 对接后端注册接口
        console.log('注册:', this.registerForm);
        alert('注册功能开发中...');
      }
    }
  };

  // 挂载到 window，供页面 script 中注册组件使用
  if (typeof window !== 'undefined') {
    window.AuthModal = AuthModal;
  }
})();
