import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { XCircle, Bell, ExternalLink, Check } from "lucide-react";

export interface NotificationPanelProps {
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  notifications: any[];
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: number | string) => void;
  handleUnlinkTelegram: () => void;
}

export default function NotificationPanel({
  notificationsOpen,
  setNotificationsOpen,
  notifications,
  markAllNotificationsRead,
  markNotificationRead,
  handleUnlinkTelegram,
}: NotificationPanelProps) {
  return (
    <AnimatePresence>
      {notificationsOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNotificationsOpen(false)}
            className="fixed inset-0 bg-black/20 z-50"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-lg shadow-2xl max-h-[80vh] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-800">الإشعارات</h3>
              <div className="flex items-center gap-2">
                {(Array.isArray(notifications) ? notifications : []).some(n => !n.is_read) && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs font-bold text-brand bg-brand-light px-3 py-1.5 rounded-full"
                  >
                    تمييز الكل كمقروء
                  </button>
                )}
                <button onClick={() => setNotificationsOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <XCircle size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {notifications.length > 0 ? (
                (Array.isArray(notifications) ? notifications : []).map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${notif.is_read ? 'opacity-60' : 'shadow-sm'} ${
                      notif.type === 'warning' ? 'bg-amber-50 border-amber-100' : 
                      notif.type === 'success' ? 'bg-brand-light border-brand-soft' : 'bg-blue-50 border-blue-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-bold ${
                        notif.type === 'warning' ? 'text-amber-800' : 
                        notif.type === 'success' ? 'text-brand' : 'text-blue-800'
                      }`}>{notif.title}</h4>
                      <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                        {notif.created_at && <span className="text-[9px] text-gray-400">{new Date(notif.created_at).toLocaleTimeString("ar-EG")}</span>}
                        {!notif.is_read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markNotificationRead(notif.id); }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              notif.type === 'warning' ? 'bg-amber-200 text-amber-800' :
                              notif.type === 'success' ? 'bg-brand text-white' : 'bg-blue-200 text-blue-800'
                            }`}
                          >
                            <Check size={14} /> مقروء
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      notif.type === 'warning' ? 'text-amber-700' : 
                      notif.type === 'success' ? 'text-brand' : 'text-blue-700'
                    }`}>{notif.message}</p>
                    {notif.action === 'unlink' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleUnlinkTelegram(); }}
                        className="mt-3 bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm"
                      >
                        فك الارتباط الآن
                      </button>
                    )}
                    {(() => {
                      const urlMatch = (notif.message || '').match(/https:\/\/[^\s]+/);
                      if (!urlMatch) return null;
                      return (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(urlMatch[0], '_blank', 'noopener,noreferrer'); }}
                          className={`mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold shadow-sm ${
                            notif.type === 'warning' ? 'bg-amber-600 text-white' :
                            notif.type === 'success' ? 'bg-brand text-white' : 'bg-blue-600 text-white'
                          }`}
                        >
                          <ExternalLink size={12} />
                          فتح الرابط
                        </button>
                      );
                    })()}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bell size={48} className="mb-4 opacity-20" />
                  <p>لا توجد إشعارات حالياً</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
