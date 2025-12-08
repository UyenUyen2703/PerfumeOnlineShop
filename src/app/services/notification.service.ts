import { Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private unreadCountSubject = new BehaviorSubject<number>(0);
    public unreadCount$ = this.unreadCountSubject.asObservable();

    constructor(private snackBar: MatSnackBar) { }

    success(message: string): void {
        this.snackBar.open(message, 'Đóng', {
            duration: 3000,
            panelClass: ['success-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'top'
        });
    }

    error(message: string): void {
        this.snackBar.open(message, 'Đóng', {
            duration: 5000,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'top'
        });
    }

    updateUnreadCount(count: number): void {
        this.unreadCountSubject.next(count);
    }

    getUnreadCount$(): Observable<number> {
        return this.unreadCount$;
    }
}
