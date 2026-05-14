<?php

namespace Modules\Communication\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $notifications = auth()->user()->notifications()->paginate(15);
        $unreadCount = auth()->user()->unreadNotifications()->count();

        return $this->ReturnSuccess([
            'notifications' => $notifications,
            'unread_count'  => $unreadCount,
        ], 'Notifications retrieved');
    }

    public function markRead($id)
    {
        $notification = auth()->user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        return $this->ReturnSuccess($notification->fresh(), 'Notification marked as read');
    }

    public function markAllRead()
    {
        auth()->user()->unreadNotifications->markAsRead();
        return $this->ReturnSuccess(null, 'All notifications marked as read');
    }

    public function unreadCount()
    {
        $count = auth()->user()->unreadNotifications()->count();
        return $this->ReturnSuccess(['unread_count' => $count], 'Unread count retrieved');
    }
}
