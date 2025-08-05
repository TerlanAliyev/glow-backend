// Fayl: src/socket/handlers/connection.handler.js

const prisma = require('../../config/prisma');
const redis = require('../../config/redis'); // Redis client-i import edirik
const { createAndSendNotification } = require('../../notification/notification.service');

const registerConnectionHandlers = (mainNamespace, socket) => {

    const sendSignal = async ({ receiverId }) => {
        try {
            const senderId = socket.userId;
            if (senderId === receiverId) return;

            // ADDIM 1: Siqnalı göndərən istifadəçinin məlumatlarını alaq
            const sender = await prisma.user.findUnique({ 
                where: { id: senderId },
                include: { profile: true }
            });
            if (!sender || !sender.profile) {
                return socket.emit('error', { message: 'İstifadəçi tapılmadı.' });
            }

            // ADDIM 2: Pulsuz istifadəçilər üçün siqnal limitini yoxlayaq
            if (sender.subscription === 'FREE') {
                const twentyFourHoursAgo = new Date(new Date() - 24 * 60 * 60 * 1000);
                const DAILY_LIMIT = 15; // Gündəlik limiti burada təyin edirik

                const signalCount = await prisma.signal.count({
                    where: { senderId: senderId, createdAt: { gte: twentyFourHoursAgo } },
                });

                if (signalCount >= DAILY_LIMIT) {
                    if (sender.profile.extraSignalCredits > 0) {
                        await prisma.profile.update({
                            where: { userId: senderId },
                            data: { extraSignalCredits: { decrement: 1 } }
                        });
                    } else {
                        return socket.emit('error', {
                            message: `Gündəlik limitiniz bitib. Video izləyərək yeni kreditlər qazana bilərsiniz.`,
                            errorCode: 'SIGNAL_LIMIT_REACHED'
                        });
                    }
                }
            }

            // ADDIM 3: Siqnalı göndərək və "match" olub-olmadığını yoxlayaq
            await prisma.$transaction(async (tx) => {
                await tx.signal.create({ data: { senderId, receiverId } });

                const mutualSignal = await tx.signal.findFirst({
                    where: { senderId: receiverId, receiverId: senderId }
                });

                const senderProfile = sender.profile;

                if (mutualSignal) {
                    // MATCH YARANDI
                    const [userAId, userBId] = [senderId, receiverId].sort((a, b) => a.localeCompare(b));
                    const existingConnection = await tx.connection.findFirst({ where: { userAId, userBId } });
                    if (existingConnection) return;

                    const newConnection = await tx.connection.create({ data: { userAId, userBId } });
                    const receiverProfile = await tx.profile.findUnique({ where: { userId: receiverId } });

                    if (receiverProfile) {
                        mainNamespace.to(senderId).emit('new_connection', { connection: newConnection, partner: receiverProfile });
                        await createAndSendNotification(senderId, 'NEW_MATCH', `${receiverProfile.name} ilə yeni bir bağlantı qurdunuz!`);
                    }
                    if (senderProfile) {
                        mainNamespace.to(receiverId).emit('new_connection', { connection: newConnection, partner: senderProfile });
                        await createAndSendNotification(receiverId, 'NEW_MATCH', `${senderProfile.name} ilə yeni bir bağlantı qurdunuz!`);
                    }

                    // Keşi təmizləyirik
                    const keysSender = await redis.keys(`connections:${senderId}:*`);
                    if (keysSender.length > 0) await redis.del(keysSender);
                    const keysReceiver = await redis.keys(`connections:${receiverId}:*`);
                    if (keysReceiver.length > 0) await redis.del(keysReceiver);
                    
                } else {
                    // TƏK TƏRƏFLİ SİQNAL
                    if (senderProfile) {
                        mainNamespace.to(receiverId).emit('signal_received', { from: senderProfile });
                        await createAndSendNotification(receiverId, 'NEW_SIGNAL', `${senderProfile.name} sizə siqnal göndərdi!`);
                    }
                }
            });
        } catch (error) {
            if (error.code !== 'P2002') {
                console.error("[SIGNAL] 'send_signal' xətası:", error);
                socket.emit('error', { message: 'Siqnal göndərilərkən xəta baş verdi.' });
            }
        }
    };

    socket.on('send_signal', sendSignal);
};

module.exports = registerConnectionHandlers;