<?php

namespace App\Policies;

use App\Models\ScheduledPost;
use App\Models\User;

class ScheduledPostPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ScheduledPost $scheduledPost): bool
    {
        return $user->id === $scheduledPost->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, ScheduledPost $scheduledPost): bool
    {
        return $user->id === $scheduledPost->user_id;
    }

    public function delete(User $user, ScheduledPost $scheduledPost): bool
    {
        return $user->id === $scheduledPost->user_id;
    }
}
