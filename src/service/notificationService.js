// notificationService.js
import { Server } from 'socket.io';
// import Notification from '../models/notification.js'; // Assuming this is the path to your Notification model

let io;

// Notification types enum
export const NotificationTypes = {
  NEW_CONTENT: 'new_content',
  CONTENT_PUBLISHED: 'content_published',
  CONTENT_UPDATED: 'content_updated',
  PROGRESS_UPDATE: 'progress_update',
  ACHIEVEMENT: 'achievement',
  MESSAGE: 'message',
  ASSIGNMENT_DUE: 'assignment_due'
};


export const initializeSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Handle user joining specific rooms (e.g., by userId, role, grade, etc.)
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.io server initialized');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocketServer first.');
  }
  return io;
};

export const createNotification = async (params) => {
    
  try {
    const notification = new Notification({
      recipient: params.recipient,
      recipientType: params.recipientType,
      kind: params.kind,
      title: params.title,
      subject: params.subject,
      message: params.message ,
      relatedContent: params.contentId,
      teacher: params.teacherId,
      contentType: params.contentType,
      metadata: params.metadata || {}
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};

export const sendNotification = async (event, recipients, data ) => { 
  try {
    const socketIO = getIO();
    const notificationPayload = {
      ...data,
      timestamp: new Date(),
      id: Date.now().toString()
    };

    if (Array.isArray(recipients)) {
      // If recipients is an array, emit to each recipient's room
      recipients.forEach(recipient => {
        socketIO.to(recipient).emit(event, notificationPayload);
      });

    } else {
      // If recipients is a string (single room/user or broadcast channel)
      socketIO.to(recipients).emit(event, notificationPayload);
    }
    
    console.log(`Notification sent to ${Array.isArray(recipients) ? recipients.length + ' recipients' : recipients}`);
    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
};

export const notifyStudentsNewContent = async (content) => {
  try {
  
    const rooms = [];
    
    if (content.grade && content.grade !== 'all') {
      rooms.push(`grade-${content.grade}`);
    }
    
    if (content.subject) {
      rooms.push(`subject-${content.subject}`);
    }
    
    if (content.accessibleTo && content.accessibleTo !== 'all' && Array.isArray(content.accessibleTo)) {
      rooms.push(...content.accessibleTo.map(userId => `user-${userId}`));
    }
    
    if (rooms.length === 0) {
      rooms.push('role-student');
    }
    
    const notificationData = {
      kind: NotificationTypes.NEW_CONTENT,
      title: 'New Content Available',
      message: `${content.title} has been added by your teacher`,
      contentId: content._id,
      contentType: content.contentType,
      subject: content.subject,
      teacherId: content.teacher,
      recipientType: 'student'
    };
    
     await sendNotification('notification', rooms, notificationData);
    console.log('all done', 'notification data: ', notificationData)
   await createNotification(notificationData)
    console.log('notification saved successfully')
  } catch (error) {
    console.error('Failed to notify students:', error);
    return false;
  }
};

export const notifyContentUpdated = async (content) => {
  try {
    const rooms = [];
    
    if (content.grade && content.grade !== 'all') {
      rooms.push(`grade-${content.grade}`);
    }
    
    if (content.subject) {
      rooms.push(`subject-${content.subject}`);
    }
    
    if (content.accessibleTo && content.accessibleTo !== 'all' && Array.isArray(content.accessibleTo)) {
      rooms.push(...content.accessibleTo.map(userId => `user-${userId}`));
    }
    
    if (rooms.length === 0) {
      rooms.push('role-student');
    }
    
    const notificationData = {
      type: NotificationTypes.CONTENT_UPDATED,
      title: 'Content Updated',
      message: `The content "${content.title}" has been updated`,
      contentId: content._id,
      contentType: content.contentType,
      recipientType: 'student' // Default to student, can be overridden
    };
    
    return await sendNotification('notification', rooms, notificationData);
  } catch (error) {
    console.error('Failed to notify about updated content:', error);
    return false;
  }
};

/**
 * Notify about progress update
 * @param {string} studentId - Student ID
 * @param {object} progressData - Progress data
 * @param {boolean} persist - Whether to save notifications to database
 * @returns {Promise<boolean>} - Success status
 */
export const notifyProgressUpdate = async (studentId, progressData, persist = true) => {
  try {
    const rooms = [`user-${studentId}`, `parent-${progressData.parentId}`].filter(Boolean);
    
    const notificationData = {
      type: NotificationTypes.PROGRESS_UPDATE,
      title: 'Progress Update',
      message: `Your ${progressData.subject} progress is now ${progressData.progress}%`,
      recipientType: 'student',
      metadata: {
        subject: progressData.subject,
        progress: progressData.progress,
        previousProgress: progressData.previousProgress
      }
    };
    
    return await sendNotification('notification', rooms, notificationData, persist);
  } catch (error) {
    console.error('Failed to notify about progress update:', error);
    return false;
  }
};

/**
 * Notify about achievement
 * @param {string} userId - User ID
 * @param {object} achievement - Achievement data
 * @param {string} recipientType - Type of recipient (student, parent, teacher)
 * @param {boolean} persist - Whether to save notifications to database
 * @returns {Promise<boolean>} - Success status
 */
export const notifyAchievement = async (userId, achievement, recipientType = 'student', persist = true) => {
  try {
    const rooms = [`user-${userId}`];
    
    const notificationData = {
      type: NotificationTypes.ACHIEVEMENT,
      title: 'New Achievement Unlocked!',
      message: `You've earned the "${achievement.name}" badge`,
      recipientType,
      metadata: {
        badgeId: achievement.badgeId,
        achievementId: achievement.id
      }
    };
    
    return await sendNotification('notification', rooms, notificationData, persist);
  } catch (error) {
    console.error('Failed to notify about achievement:', error);
    return false;
  }
};

/**
 * Notify about new message
 * @param {string} senderId - Sender ID
 * @param {string} recipientId - Recipient ID
 * @param {object} message - Message data
 * @param {boolean} persist - Whether to save notifications to database
 * @returns {Promise<boolean>} - Success status
 */
export const notifyNewMessage = async (senderId, recipientId, message, persist = true) => {
  try {
    const rooms = [`user-${recipientId}`];
    
    const notificationData = {
      type: NotificationTypes.MESSAGE,
      title: 'New Message',
      message: `You have a new message from ${message.senderName}`,
      recipientType: message.recipientType,
      metadata: {
        senderId,
        messageId: message.id,
        conversationId: message.conversationId
      }
    };
    
    return await sendNotification('notification', rooms, notificationData, persist);
  } catch (error) {
    console.error('Failed to notify about new message:', error);
    return false;
  }
};

/**
 * Notify about due assignment
 * @param {string} studentId - Student ID
 * @param {object} assignment - Assignment data
 * @param {boolean} persist - Whether to save notifications to database
 * @returns {Promise<boolean>} - Success status
 */
export const notifyAssignmentDue = async (studentId, assignment, persist = true) => {
  try {
    const rooms = [`user-${studentId}`];
    
    const notificationData = {
      type: NotificationTypes.ASSIGNMENT_DUE,
      title: 'Assignment Due Soon',
      message: `Your assignment "${assignment.title}" is due on ${assignment.dueDate}`,
      recipientType: 'student',
      metadata: {
        assignmentId: assignment.id,
        dueDate: assignment.dueDate,
        subject: assignment.subject
      }
    };
    
    return await sendNotification('notification', rooms, notificationData, persist);
  } catch (error) {
    console.error('Failed to notify about due assignment:', error);
    return false;
  }
};