// 反馈管理JavaScript
let currentFeedbackId = null;

// 获取存储的API令牌
function getApiToken() {
  return localStorage.getItem("adminToken");
}

// 检查认证状态
function checkAuth() {
  const token = getApiToken();
  if (!token) {
    alert("认证已过期，请重新登录");
    window.location.reload();
    return false;
  }
  return true;
}

// API请求封装
async function apiRequest(url, options = {}) {
  if (!checkAuth()) {
    throw new Error("认证失败");
  }

  const token = getApiToken();
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  // 检查认证状态
  if (response.status === 401) {
    localStorage.removeItem("adminToken");
    alert("认证已过期，请重新登录");
    window.location.reload();
    throw new Error("认证已过期");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "请求失败");
  }

  return data;
}

// 显示错误信息
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

// 获取状态中文名称
function getStatusText(status) {
  const statusMap = {
    pending: "待处理",
    in_progress: "处理中",
    resolved: "已解决",
    rejected: "已拒绝",
  };
  return statusMap[status] || status;
}

// 获取类型中文名称
function getTypeText(type) {
  const typeMap = {
    bug: "Bug报告",
    feature: "功能建议",
    improvement: "改进建议",
    other: "其他",
  };
  return typeMap[type] || type;
}

// 格式化日期
function formatDate(dateString) {
  return new Date(dateString).toLocaleString("zh-CN");
}

// 加载反馈列表
async function loadFeedbacks() {
  try {
    const statusFilter = document.getElementById("status-filter").value;
    const typeFilter = document.getElementById("type-filter").value;

    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (typeFilter) params.append("type", typeFilter);

    const data = await apiRequest(`/admin/api/feedback?${params}`);

    // 更新统计数据
    updateStats(data.data.stats);

    // 更新反馈列表
    updateFeedbackList(data.data.feedbacks);
  } catch (error) {
    showError("加载反馈数据失败: " + error.message);
  }
}

// 更新统计数据
function updateStats(stats) {
  document.getElementById("total-count").textContent = stats.total;
  document.getElementById("pending-count").textContent = stats.pending;
  document.getElementById("resolved-count").textContent = stats.resolved;
  document.getElementById("bug-count").textContent = stats.bugs;
}

// 更新反馈列表
function updateFeedbackList(feedbacks) {
  const listContainer = document.getElementById("feedback-list");

  if (feedbacks.length === 0) {
    listContainer.innerHTML = '<div class="loading">暂无反馈数据</div>';
    return;
  }

  const html = feedbacks
    .map(
      (feedback) => `
        <div class="feedback-item" onclick="showFeedbackDetail(${feedback.id})">
            <div class="feedback-header">
                <div class="feedback-title">${feedback.title}</div>
                <div class="feedback-meta">
                    <span class="status-badge status-${
                      feedback.status
                    }">${getStatusText(feedback.status)}</span>
                    <span class="type-badge">${getTypeText(
                      feedback.type
                    )}</span>
                </div>
            </div>
            <div class="feedback-meta">
                <span>用户: ${feedback.telegram_user_id}</span>
                <span>提交时间: ${formatDate(feedback.created_at)}</span>
                ${feedback.admin_reply ? "<span>✅ 已回复</span>" : ""}
            </div>
        </div>
    `
    )
    .join("");

  listContainer.innerHTML = html;
}

// 显示反馈详情
async function showFeedbackDetail(feedbackId) {
  try {
    currentFeedbackId = feedbackId;
    const data = await apiRequest(`/admin/api/feedback/${feedbackId}`);
    const feedback = data.data;

    const detailHtml = `
            <div class="form-group">
                <label>反馈ID:</label>
                <p>#${feedback.id}</p>
            </div>
            <div class="form-group">
                <label>用户:</label>
                <p>${feedback.telegram_user_id}</p>
            </div>
            <div class="form-group">
                <label>类型:</label>
                <p>${getTypeText(feedback.type)}</p>
            </div>
            <div class="form-group">
                <label>当前状态:</label>
                <p>${getStatusText(feedback.status)}</p>
            </div>
            <div class="form-group">
                <label>标题:</label>
                <p>${feedback.title}</p>
            </div>
            <div class="form-group">
                <label>内容:</label>
                <p style="white-space: pre-wrap;">${feedback.content}</p>
            </div>
            <div class="form-group">
                <label>提交时间:</label>
                <p>${formatDate(feedback.created_at)}</p>
            </div>
            ${
              feedback.admin_reply
                ? `
                <div class="form-group">
                    <label>已有回复:</label>
                    <p style="white-space: pre-wrap; background: #f8f9fa; padding: 10px; border-radius: 4px;">${feedback.admin_reply}</p>
                </div>
            `
                : ""
            }
        `;

    document.getElementById("feedback-detail").innerHTML = detailHtml;
    document.getElementById("status-update").value = feedback.status;
    document.getElementById("admin-reply").value = feedback.admin_reply || "";

    document.getElementById("feedback-modal").style.display = "block";
  } catch (error) {
    showError("加载反馈详情失败: " + error.message);
  }
}

// 关闭反馈详情模态框
function closeFeedbackModal() {
  document.getElementById("feedback-modal").style.display = "none";
  currentFeedbackId = null;
}

// 更新反馈
async function updateFeedback() {
  if (!currentFeedbackId) return;

  try {
    const newStatus = document.getElementById("status-update").value;
    const reply = document.getElementById("admin-reply").value.trim();

    // 更新状态
    await apiRequest(`/admin/api/feedback/${currentFeedbackId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });

    // 如果有回复内容，添加回复
    if (reply) {
      await apiRequest(`/admin/api/feedback/${currentFeedbackId}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply }),
      });
    }

    closeFeedbackModal();
    loadFeedbacks(); // 重新加载列表

    alert("更新成功！");
  } catch (error) {
    showError("更新失败: " + error.message);
  }
}

// 退出登录
function logout() {
  if (confirm("确定要退出登录吗？")) {
    localStorage.removeItem("adminToken");
    window.location.reload();
  }
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", function () {
  // 检查认证状态
  if (!checkAuth()) {
    return;
  }

  loadFeedbacks();

  // 绑定筛选器变化事件
  document
    .getElementById("status-filter")
    .addEventListener("change", loadFeedbacks);
  document
    .getElementById("type-filter")
    .addEventListener("change", loadFeedbacks);

  // 点击模态框外部关闭
  document
    .getElementById("feedback-modal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        closeFeedbackModal();
      }
    });
});
