/*
 * 文件: src/app/actions.ts
 * 描述: 这是您的服务器动作文件。
 * 它包含与数据库交互的逻辑，并且只在服务器上运行。
 */
'use server';

import { kv } from '@vercel/kv';

// 定义联系表单数据的类型接口
interface ContactFormData {
  name: string;
  serviceArea: string;
  email: string;
  countryKey: string;
  phone: string;
  state: string;
}

// 定义页脚邮件订阅表单数据的类型接口
interface FooterEmailData {
    email: string;
}

/**
 * 将主联系表单的数据保存到 Redis。
 * @param formData - 包含用户联系信息的对象。
 * @returns 一个表示操作成功或失败的对象。
 */
export async function saveContactToRedis(formData: ContactFormData) {
  try {
    // 使用姓名和邮箱组合成更唯一的 Key
    const key = `contact:${formData.name}:${formData.email}`; 
    if (!formData.name) {
      throw new Error("姓名不能为空，无法作为主键保存。");
    }
    
    // 将数据存入 Vercel KV
    await kv.set(key, JSON.stringify(formData));
    
    console.log(`联系资料已成功写入 Redis，Key 为: ${key}`);
    return { success: true };
  } catch (error) {
    console.error("写入联系资料到 Redis 时出错:", error);
    // 返回一个包含错误信息的对象，以便在客户端处理
    return { success: false, error: error instanceof Error ? error.message : '一个未知错误发生了' };
  }
}

/**
 * 将页脚订阅的邮箱地址保存到 Redis。
 * @param emailData - 包含用户邮箱的对象。
 * @returns 一个表示操作成功或失败的对象。
 */
export async function saveFooterEmailToRedis(emailData: FooterEmailData) {
    try {
        const email = emailData.email;
        if(!email) {
            throw new Error("邮箱地址不能为空。");
        }
        // 使用邮箱作为 Key，并添加前缀以区分
        const key = `subscription:${email}`;

        // 将数据存入 Vercel KV。这里只存邮箱，也可以存一个带有订阅时间的对象。
        await kv.set(key, JSON.stringify({ email: email, subscribedAt: new Date().toISOString() }));

        console.log(`订阅邮箱已成功写入 Redis，Key 为: ${key}`);
        return { success: true };
    } catch (error) {
        console.error("写入订阅邮箱到 Redis 时出错:", error);
        return { success: false, error: error instanceof Error ? error.message : '一个未知错误发生了' };
    }
}
